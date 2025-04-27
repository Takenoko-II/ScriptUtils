import { Vector2, Vector3 } from "@minecraft/server";
import { FiniteRange, IntRange, BigIntRange } from "./NumberRange.js";
import { DualAxisRotationBuilder, TripleAxisRotationBuilder, Vector3Builder } from "./Vector.js";

export interface RandomNumberGenerator {
    int(range: IntRange): number;

    decimal(range: FiniteRange): number;
}

export interface NoiseGenerationOptions {
    frequency: number;

    amplitude: number;
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

class PerlinNoise {
    private readonly permutation: number[];

    private readonly offset: Vector3;

    public constructor(generator: RandomNumberGenerator) {
        this.offset = Vector3Builder.zero().operate(() => (generator.int(IntRange.minMax(0, 2 ** 31 - 1)) / (2 ** 31 - 1)) * 256);

        this.permutation = Array(256).fill(0).map(() => generator.int(IntRange.minMax(0, 255)));

        for (let i = 0; i < 256; i++) {
            let index: number = generator.int(IntRange.minMax(i, 255));
            let old: number = this.permutation[i];
            this.permutation[i] = this.permutation[index];
            this.permutation[index] = old;
            this.permutation[i + 256] = this.permutation[i];
        }
    }

    public noise3(v: Vector3, options: NoiseGenerationOptions): number {
        v.x *= options.frequency;
        v.y *= options.frequency;
        v.z *= options.frequency;

        v.x += this.offset.x;
        v.y += this.offset.y;
        v.z += this.offset.z;

        const floorX: number = Math.floor(v.x);
        const floorY: number = Math.floor(v.y);
        const floorZ: number = Math.floor(v.z);

        const X = floorX & 255;
        const Y = floorY & 255;
        const Z = floorZ & 255;

        v.x -= floorX;
        v.y -= floorY;
        v.z -= floorZ;

        const fadeX = PerlinNoise.fade(v.x);
        const fadeY = PerlinNoise.fade(v.y);
        const fadeZ = PerlinNoise.fade(v.z);

        const A = this.permutation[X] + Y;
        const AA = this.permutation[A] + Z;
        const AB = this.permutation[A + 1] + Z;
        const B = this.permutation[X + 1] + Y;
        const BA = this.permutation[B] + Z;
        const BB = this.permutation[B + 1] + Z;

        return options.amplitude * PerlinNoise.lerp({
            x: fadeZ,
            y: PerlinNoise.lerp({
                x: fadeY,
                y: PerlinNoise.lerp({
                    x: fadeX,
                    y: PerlinNoise.gradient(this.permutation[AA], v),
                    z: PerlinNoise.gradient(this.permutation[BA],  { x: v.x -1, y: v.y, z: v.z })
                }),
                z: PerlinNoise.lerp({
                    x: fadeX,
                    y: PerlinNoise.gradient(this.permutation[AB], { x: v.x, y: v.y - 1.0, z: v.z }),
                    z: PerlinNoise.gradient(this.permutation[BB], { x: v.x - 1.0, y: v.y - 1.0, z: v.z })
                })
            }),
            z: PerlinNoise.lerp({
                x: fadeY,
                y: PerlinNoise.lerp({
                    x: fadeX,
                    y: PerlinNoise.gradient(this.permutation[AA + 1], { x: v.x, y: v.y, z: v.z - 1.0 }),
                    z: PerlinNoise.gradient(this.permutation[BA + 1], { x: v.x - 1.0, y: v.y, z: v.z - 1.0 })
                }),
                z: PerlinNoise.lerp({
                    x: fadeX,
                    y: PerlinNoise.gradient(this.permutation[AB + 1], { x: v.x, y: v.y - 1.0, z: v.z - 1.0 }),
                    z: PerlinNoise.gradient(this.permutation[BB + 1], { x: v.x - 1.0, y: v.y - 1.0, z: v.z - 1.0 })
                })
            })
        });
    }

    public noise2(v: Vector2, options: NoiseGenerationOptions): number {
        return this.noise3({ x: v.x, y: v.y, z: 0 }, options);
    }

    public noise1(v: number, options: NoiseGenerationOptions): number {
        return this.noise2({ x: v, y: 0 }, options);
    }

    private static fade(x: number): number {
        return (6 * x ** 5) - (15 * x ** 4) + (10 * x ** 3);
    }

    private static lerp(v: Vector3): number {
        return v.y + v.x * (v.z - v.y);
    }

    private static gradient(hash: number, distanceVector: Vector3): number {
        hash &= 15;

        const u = hash < 8 ? distanceVector.x : distanceVector.y;
        const v = hash < 4 ? distanceVector.y : (hash !== 12 && hash !== 14 ? distanceVector.z : distanceVector.x);

        return ((hash & 1) === 0 ? u : -u) + ((hash & 2) === 0 ? v : -v);
    }
}

export class Random {
    private readonly noiseGenerator: PerlinNoise;

    public constructor(private readonly randomNumberGenerator: RandomNumberGenerator) {
        this.noiseGenerator = new PerlinNoise(randomNumberGenerator);
    }

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

    public sign(): 1 | -1 {
        return this.chance(0.5) ? 1 : -1;
    }

    public choice<const T>(list: T[]): T {
        return list[this.randomNumberGenerator.int(IntRange.minMax(0, list.length - 1))];
    }

    public sample<T>(set: Set<T>, count: number): Set<T> {
        if (count < 0 || count > set.size) {
            throw new TypeError();
        }

        return new Set(
            this.shuffledClone([...set])
                .slice(0, count)
        );
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

    public rotation2(): DualAxisRotationBuilder {
        return new DualAxisRotationBuilder(
            this.randomNumberGenerator.decimal(FiniteRange.minMax(-180, 180)),
            this.randomNumberGenerator.decimal(FiniteRange.minMax(-90, 90))
        );
    }

    public rotation3(): TripleAxisRotationBuilder {
        return new TripleAxisRotationBuilder(
            this.randomNumberGenerator.decimal(FiniteRange.minMax(-180, 180)),
            this.randomNumberGenerator.decimal(FiniteRange.minMax(-90, 90)),
            this.randomNumberGenerator.decimal(FiniteRange.minMax(-180, 180))
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

    public noise3(v: Vector3, options: NoiseGenerationOptions): number {
        return this.noiseGenerator.noise3(v, options);
    }

    public noise2(v: Vector2, options: NoiseGenerationOptions): number {
        return this.noiseGenerator.noise2(v, options);
    }

    public noise1(v: number, options: NoiseGenerationOptions): number {
        return this.noiseGenerator.noise1(v, options);
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
