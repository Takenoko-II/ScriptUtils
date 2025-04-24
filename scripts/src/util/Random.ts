import { FiniteRange, IntRange, BigIntRange } from "./NumberRange.js";
import { TripleAxisRotationBuilder } from "./Vector.js";

export interface RandomNumberGenerator {
    int(range: IntRange): number;

    decimal(range: FiniteRange): number;
}

export class Xorshift32 implements RandomNumberGenerator {
    private x: number = 123456789;
    private y: number = 362436069;
    private z: number = 521288629;
    private w: number;

    public constructor(seed: number) {
        if (!Number.isInteger(seed)) {
            throw new TypeError();
        }

        this.w = seed;
    }

    public next(): number {
        let t = this.x ^ (this.x << 11);

        this.x = this.y;
        this.y = this.z;
        this.z = this.w;
        this.w = (this.w ^ (this.w >>> 19)) ^ (t ^ (t >>> 8));

        return this.w - IntRange.INT32_MAX_RANGE.getMin();
    }

    public int(range: IntRange): number {
        const min = range.getMin();
        const max = range.getMax();
        return this.next() % (max - min + 1) + min;
    }

    public decimal(range: FiniteRange): number {
        const min = range.getMin();
        const max = range.getMax();
        return (this.next() / IntRange.UINT32_MAX_RANGE.getMax()) * (max - min) + min;
    }

    public static random(): Xorshift32 {
        return new this(Random.uInt32());
    }
}

export class Xorshift128Plus implements RandomNumberGenerator {
    private readonly s: [bigint, bigint] = [0n, 0n];

    public constructor(seed0: bigint, seed1: bigint) {
        if (seed0 === 0n && seed1 === 0n) {
            seed1 = 1n;
        }

        const mask: bigint = (1n << 64n) - 1n;

        this.s[0] = seed0 & mask;
        this.s[1] = seed1 & mask;

        for (let i = 0; i < 4; i++) {
            this.next(); // 始めの方はシード値が小さいと結果が偏るため
        }
    }

    private extract64(value: bigint): bigint {
        return value & ((1n << 64n) - 1n);
    }

    public next(): bigint {
        let s1: bigint = this.s[0];
        let s0: bigint = this.s[1];

        this.s[0] = s0;

        s1 ^= this.extract64(s1 << 23n);
        s1 ^= this.extract64(s1 >> 18n);
        s1 ^= s0;
        s1 ^= this.extract64(s0 >> 5n);

        this.s[1] = s1;

        return this.s[0] + this.s[1];
    }

    public bigint(range: BigIntRange): bigint {
        let value: bigint = this.next();

        return value % (range.getMax() - range.getMin() + 1n) + range.getMin();
    }

    public int(range: IntRange): number {
        return Number(this.bigint(range.toBigInt()));
    }

    public decimal(range: FiniteRange): number {
        const digit = 10n;

        const scale = 10n ** digit;
        const intRange = BigIntRange.minMax(0n, scale);

        const ratio: number = Number(this.bigint(intRange) * scale / intRange.getMax()) / Number(scale);
        return ratio * (range.getMax() - range.getMin()) + range.getMin();
    }

    public static random(): Xorshift128Plus {
        return new this(Random.uBigInt64(), Random.uBigInt64());
    }
}

export class Random {
    public constructor(private readonly randomNumberGenerator: RandomNumberGenerator) {}

    public uuid(): string {
        const chars = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.split('');

        for (let i = 0; i < chars.length; i++) {
            switch (chars[i]) {
                case 'x':
                    chars[i] = this.randomNumberGenerator.int(IntRange.minMax(0, 15)).toString(16);
                    break;
                case 'y':
                    chars[i] = this.randomNumberGenerator.int(IntRange.minMax(8, 11)).toString(16);
                    break;
            }
        }

        return chars.join('');
    }

    public chance(chance: number): boolean {
        return this.randomNumberGenerator.decimal(FiniteRange.minMax(0, 1)) < chance;
    }

    public sign(): number {
        return this.chance(0.5) ? 1 : -1;
    }

    public choice<T>(list: T[]): T {
        return list[this.randomNumberGenerator.int(IntRange.minMax(0, list.length - 1))];
    }

    public sample<T>(set: Set<T>, count: number): Set<T> {
        return new Set(this.shuffledClone([...set]).slice(0, count));
    }

    public boxMuller(): number {
        let a: number, b: number;

        do {
            a = this.randomNumberGenerator.decimal(FiniteRange.minMax(0, 1));
        }
        while (a === 0);

        do {
            b = this.randomNumberGenerator.decimal(FiniteRange.minMax(0, 1));
        }
        while (b === 1);

        return Math.sqrt(-2 * Math.log(a)) * Math.sin(2 * Math.PI * b);
    }

    public rotation(): TripleAxisRotationBuilder {
        return new TripleAxisRotationBuilder(
            this.randomNumberGenerator.decimal(FiniteRange.minMax(-180, 179)),
            this.randomNumberGenerator.decimal(FiniteRange.minMax(-90, 90)),
            this.randomNumberGenerator.decimal(FiniteRange.minMax(-180, 179))
        );
    }

    public weightedChoice<T extends string>(map: Record<T, number>): T {
        let sum: number = 0;
        for (const uncasted of Object.values(map)) {
            const val = uncasted as number;

            if (!(Number.isSafeInteger(val) && val > 0)) {
                throw new TypeError("重みとなる値は安全な範囲の正の整数である必要があります");
            }

            sum += val;
        }

        const random = this.randomNumberGenerator.int(IntRange.minMax(1, sum));

        let totalWeight = 0;
        for (const [key, weight] of Object.entries(map)) {
            totalWeight += weight as number;
            if (totalWeight >= random) return key as T;
        }

        throw new TypeError("NEVER HAPPENS");
    }

    public shuffledClone<T>(list: T[]): T[] {
        const clone = [...list];

        if (list.length <= 1) return clone;

        for (let i = clone.length - 1; i >= 0; i--) {
            const current = clone[i];
            const random = this.randomNumberGenerator.int(IntRange.minMax(0, i));

            clone[i] = clone[random];
            clone[random] = current;
        }

        return clone;
    }

    public static uInt32(): number {
        return Math.floor(Math.random() * (2 ** 32));
    }

    public static uBigInt64(): bigint {
        const high: number = Math.floor(Math.random() * (2 ** 32));
        const low: number = Math.floor(Math.random() * (2 ** 32));

        return (BigInt(high) << 32n) | BigInt(low);
    }
}
