import { FiniteRange, IntRange, BigIntRange } from "./NumberRange.js";

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

    public rand(): number {
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
        return this.rand() % (max - min) + min;
    }

    public decimal(range: FiniteRange): number {
        const min = range.getMin();
        const max = range.getMax();
        return (this.rand() / IntRange.UINT32_MAX_RANGE.getMax()) * (max - min) + min;
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
            this.rand(); // 始めの方はシード値が小さいと結果が偏るため
        }
    }

    private extract64(value: bigint): bigint {
        return value & ((1n << 64n) - 1n);
    }

    public rand(): bigint {
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
        let value: bigint = this.rand();

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
}

export class Random {
    public constructor(private readonly randomNumberGenerator: RandomNumberGenerator) {}

    private int(range: IntRange): number {
        return this.randomNumberGenerator.int(range);
    }

    private decimal(range: FiniteRange): number {
        return this.randomNumberGenerator.decimal(range);
    }

    public uuid(): string {
        const chars = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.split('');

        for (let i = 0; i < chars.length; i++) {
            switch (chars[i]) {
                case 'x':
                    chars[i] = this.int(IntRange.minMax(0, 15)).toString(16);
                    break;
                case 'y':
                    chars[i] = this.int(IntRange.minMax(8, 11)).toString(16);
                    break;
            }
        }

        return chars.join('');
    }

    public chance(chance: number): boolean {
        return this.decimal(FiniteRange.minMax(0, 1)) < chance;
    }

    public sign(): number {
        return this.chance(0.5) ? 1 : -1;
    }

    public choice<T>(list: T[]): T {
        return list[this.int(IntRange.minMax(0, list.length - 1))];
    }

    public choiceIndexbyWeight(weights: number[]): number {
        const sum = weights.reduce((a, b) => a + b);
        const random = this.int(IntRange.minMax(1, sum));
    
        let totalWeight = 0;
        for (const [index, weight] of weights.entries()) {
            totalWeight += weight;
            if (totalWeight >= random) return index;
        }

        throw new TypeError("NEVER HAPPENS");
    }

    public shuffle<T>(list: T[]): T[] {
        const clone = [...list];

        if (list.length <= 1) return clone;

        for (let i = clone.length - 1; i >= 0; i--) {
            const current = clone[i];
            const random = this.int(IntRange.minMax(0, i));

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

    public static xorshift32(): Xorshift32 {
        return new Xorshift32(Random.uInt32());
    }

    public static xorshift128Plus(): Xorshift128Plus {
        return new Xorshift128Plus(Random.uBigInt64(), Random.uBigInt64());
    }
}
