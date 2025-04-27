import { Direction, Vector2, Vector3, VectorXZ } from "@minecraft/server";
import { sentry } from "../lib/TypeSentry";

export interface ReadonlyVector3 extends Vector3 {
    readonly x: number;

    readonly y: number;

    readonly z: number;
}

export interface ReadonlyVector2 extends Vector2 {
    readonly x: number;

    readonly y: number;
}

export interface ReadonlyVectorXZ extends VectorXZ {
    readonly x: number;

    readonly z: number;
}

export interface IVectorBuilder<T extends IVectorBuilder<T>> {
    equals(other: unknown): boolean;

    operate(callbackFn: (comopnent: number) => number): T;

    operate(other: T, callbackFn: (comopnent1: number, comopnent2: number) => number): T;

    add(other: T): T;

    subtract(other: T): T;

    scale(scalar: number): T;

    divide(scalar: number): T;

    clamp(min: T, max: T): T;

    format(format: string, digits: number): string;

    toString(): string;

    clone(): T;

    isZero(): boolean;
}

export class Vector3Builder implements Vector3, IVectorBuilder<Vector3Builder> {
    private __x__: number;
    private __y__: number;
    private __z__: number;

    public constructor(x: number, y: number, z: number) {
        const nonNaNNumber = sentry.number.nonNaN();

        if (!(nonNaNNumber.test(x) && nonNaNNumber.test(y) && nonNaNNumber.test(z))) {
            throw new TypeError();
        }

        this.__x__ = x;
        this.__y__ = y;
        this.__z__ = z;
    }

    public get x(): number {
        return this.__x__;
    }

    public set x(value: number) {
        if (!sentry.number.nonNaN().test(value)) {
            throw new TypeError();
        }

        this.__x__ = value;
    }

    public get y(): number {
        return this.__y__;
    }

    public set y(value: number) {
        if (!sentry.number.nonNaN().test(value)) {
            throw new TypeError();
        }

        this.__y__ = value;
    }

    public get z(): number {
        return this.__z__;
    }

    public set z(value: number) {
        if (!sentry.number.nonNaN().test(value)) {
            throw new TypeError();
        }

        this.__z__ = value;
    }

    public equals(other: unknown): boolean {
        if (Vector3Builder.isVector3(other)) {
            return this.__x__ === other.x
            && this.__y__ === other.y
            && this.__z__ === other.z;
        }
        else return false;
    }

    public operate(callbackFn: (comopnent: number) => number): Vector3Builder;

    public operate(other: Vector3, callbackFn: (comopnent1: number, comopnent2: number) => number): Vector3Builder;

    public operate(a: Vector3 | ((comopnent: number) => number), b?: (comopnent1: number, comopnent2: number) => number): Vector3Builder {
        if (typeof a === "function" && b === undefined) {
            this.__x__ = a(this.__x__);
            this.__y__ = a(this.__y__);
            this.__z__ = a(this.__z__);
        }
        else if (Vector3Builder.isVector3(a) && typeof b === "function") {
            this.__x__ = b(this.__x__, a.x);
            this.__y__ = b(this.__y__, a.y);
            this.__z__ = b(this.__z__, a.z);
        }
        else {
            throw new TypeError();
        }
        return this;
    }

    public add(other: Vector3): Vector3Builder {
        if (!Vector3Builder.isVector3(other)) {
            throw new TypeError();
        }

        return this.operate(other, (a, b) => a + b);
    }

    public subtract(other: Vector3): Vector3Builder {
        if (!Vector3Builder.isVector3(other)) {
            throw new TypeError();
        }

        return this.add(Vector3Builder.from(other).clone().invert());
    }

    public scale(scalar: number): Vector3Builder {
        if (!sentry.number.nonNaN().test(scalar)) {
            throw new TypeError();
        }

        return this.operate(component => component * scalar);
    }

    public divide(scalar: number): Vector3Builder {
        if (!sentry.number.nonNaN().test(scalar)) {
            throw new TypeError();
        }

        if (scalar === 0) {
            throw new TypeError();
        }

        return this.operate(component => component / scalar);
    }

    public invert(): Vector3Builder {
        return this.scale(-1);
    }

    public dot(other: Vector3): number {
        if (!Vector3Builder.isVector3(other)) {
            throw new TypeError();
        }

        return this.__x__ * other.x + this.__y__ * other.y + this.__z__ * other.z;
    }

    public cross(other: Vector3): Vector3Builder {
        if (!Vector3Builder.isVector3(other)) {
            throw new TypeError();
        }

        const x1 = this.__x__;
        const y1 = this.__y__;
        const z1 = this.__z__;
        const x2 = other.x;
        const y2 = other.y;
        const z2 = other.z;

        return new Vector3Builder(
            y1 * z2 - z1 * y2,
            z1 * x2 - x1 * z2,
            x1 * y2 - y1 * x2
        );
    }

    public hadamard(other: Vector3): Vector3Builder {
        if (!Vector3Builder.isVector3(other)) {
            throw new TypeError();
        }

        return this.clone().operate(other, (a, b) => a * b);
    }

    public length(): number;

    public length(length: number): Vector3Builder;

    public length(length?: number): number | Vector3Builder {
        if (length === undefined) {
            return Math.sqrt(this.dot(this));
        }
        else if (sentry.number.nonNaN().test(length)) {
            const previous = this.length();

            if (previous === 0) {
                return this;
            }

            return this.operate(component => component / previous * length);
        }
        else {
            throw new TypeError();
        }
    }

    public normalize(): Vector3Builder {
        return this.length(1);
    }

    public getAngleBetween(other: Vector3): number {
        if (!Vector3Builder.isVector3(other)) {
            throw new TypeError();
        }

        const cos: number = this.dot(other) / (this.length() * Vector3Builder.from(other).length());
        return Math.acos(cos) * 180 / Math.PI;
    }

    public getDistanceTo(other: Vector3): number {
        if (!Vector3Builder.isVector3(other)) {
            throw new TypeError();
        }

        return Math.hypot(
            this.__x__ - other.x,
            this.__y__ - other.y,
            this.__z__ - other.z
        );
    }

    public getDirectionTo(other: Vector3): Vector3Builder {
        if (!Vector3Builder.isVector3(other)) {
            throw new TypeError();
        }

        return Vector3Builder.from(other).clone()
            .subtract(this)
            .normalize();
    }

    public project(other: Vector3): Vector3Builder {
        if (!Vector3Builder.isVector3(other)) {
            throw new TypeError();
        }

        const wrapped = Vector3Builder.from(other);

        return wrapped.clone().scale(
            wrapped.length() * this.length() / wrapped.length() * wrapped.length()
        );
    }

    public reject(other: Vector3): Vector3Builder {
        if (!Vector3Builder.isVector3(other)) {
            throw new TypeError();
        }

        return this.clone().subtract(this.project(other));
    }

    public reflect(normal: Vector3): Vector3Builder {
        if (!Vector3Builder.isVector3(normal)) {
            throw new TypeError();
        }

        const dot = this.dot(normal);

        return this.clone().operate(normal, (a, b) => a - 2 * dot * b);
    }

    public lerp(other: Vector3, t: number): Vector3Builder {
        if (!sentry.number.nonNaN().test(t)) {
            throw new TypeError();
        }

        if (!Vector3Builder.isVector3(other)) {
            throw new TypeError();
        }

        const linear = (a: number, b: number) => (1 - t) * a + t * b;

        return new Vector3Builder(
            linear(this.__x__, other.x),
            linear(this.__y__, other.y),
            linear(this.__z__, other.z)
        );
    }

    public slerp(other: Vector3, s: number): Vector3Builder {
        if (!sentry.number.nonNaN().test(s)) {
            throw new TypeError();
        }

        if (!Vector3Builder.isVector3(other)) {
            throw new TypeError();
        }

        const angle = this.getAngleBetween(other) * Math.PI / 180;

        const p1 = Math.sin(angle * (1 - s)) / Math.sin(angle);
        const p2 = Math.sin(angle * s) / Math.sin(angle);

        const q1 = this.clone().scale(p1);
        const  q2 = Vector3Builder.from(other).clone().scale(p2);

        return q1.add(q2);
    }

    public clamp(min: Vector3, max: Vector3): Vector3Builder {
        if (!(Vector3Builder.isVector3(min) && Vector3Builder.isVector3(max))) {
            throw new TypeError();
        }

        const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

        this.__x__ = clamp(this.__x__, min.x, max.x);
        this.__y__ = clamp(this.__y__, min.y, max.y);
        this.__z__ = clamp(this.__z__, min.z, max.z);

        return this;
    }

    public clone(): Vector3Builder {
        return new Vector3Builder(this.__x__, this.__y__, this.__z__);
    }

    public format(format: string, digits: number): string {
        if (!sentry.number.nonNaN().test(digits)) {
            throw new TypeError();
        }
        else if (digits < 0 || digits > 20) {
            throw new RangeError();
        }

        const cx = this.__x__.toFixed(digits);
        const cy = this.__y__.toFixed(digits);
        const cz = this.__z__.toFixed(digits);

        return format
            .replace(/\$x/g, cx)
            .replace(/\$y/g, cy)
            .replace(/\$z/g, cz)
            .replace("$c", cx)
            .replace("$c", cy)
            .replace("$c", cz)
            .replace(/\$c/g, "");
    }

    public toString(): string {
        return this.format("($x, $y, $z)", 1);
    }

    public getRotation2d(): DualAxisRotationBuilder {
        const normalized = this.clone().normalize();

        return new DualAxisRotationBuilder(
            -Math.atan2(normalized.__x__, normalized.__z__) * 180 / Math.PI,
            -Math.asin(normalized.__y__) * 180 / Math.PI
        );
    }

    public rotate(axis: Vector3, angle: number): Vector3Builder {
        if (!Vector3Builder.isVector3(axis)) {
            throw new TypeError();
        }

        const angleInRad = angle * Math.PI / 180;
        const sin = Math.sin(angleInRad);
        const cos = Math.cos(angleInRad);
        const { x, y, z } = axis;

        const matrix: number[][] = [
            [
                cos + x * x * (1 - cos),
                x * y * (1 - cos) - z * sin,
                x * z * (1 - cos) + y * sin
            ],
            [
                y * x * (1 - cos) + z * sin,
                cos + y * y * (1 - cos),
                y * z * (1 - cos) - x * sin
            ],
            [
                z * x * (1 - cos) - y * sin,
                z * y * (1 - cos) + x * sin,
                cos + z * z * (1 - cos)
            ]
        ];

        const a: number = matrix[0][0] * this.x + matrix[0][1] * this.y + matrix[0][2] * this.z;
        const b: number = matrix[1][0] * this.x + matrix[1][1] * this.y + matrix[1][2] * this.z;
        const c: number = matrix[2][0] * this.x + matrix[2][1] * this.y + matrix[2][2] * this.z;

        this.__x__ = a;
        this.__y__ = b;
        this.__z__ = c;

        return this;
    }

    public isZero(): boolean {
        return this.equals(Vector3Builder.zero());
    }

    public freeze(): ReadonlyVector3 {
        return Object.freeze({ x: this.x, y: this.y, z: this.z });
    }

    public freezeAsXZ(): ReadonlyVectorXZ {
        return Object.freeze({ x: this.x, z: this.z });
    }

    public static isVector3(value: unknown): value is Vector3 {
        return sentry.objectOf({
            x: sentry.number.nonNaN(),
            y: sentry.number.nonNaN(),
            z: sentry.number.nonNaN()
        }).test(value);
    }

    public static isVectorXZ(value: unknown): value is VectorXZ {
        return sentry.objectOf({
            x: sentry.number.nonNaN(),
            z: sentry.number.nonNaN()
        }).test(value);
    }

    public static zero(): Vector3Builder {
        return new this(0, 0, 0);
    }

    public static forward(): Vector3Builder {
        return new this(0, 0, 1);
    }

    public static back(): Vector3Builder {
        return new this(0, 0, -1);
    }

    public static left(): Vector3Builder {
        return new this(1, 0, 0);
    }

    public static right(): Vector3Builder {
        return new this(-1, 0, 0);
    }

    public static up(): Vector3Builder {
        return new this(0, 1, 0);
    }

    public static down(): Vector3Builder {
        return new this(0, -1, 0);
    }

    public static filled(value: number): Vector3Builder {
        return new Vector3Builder(value, value, value);
    }

    public static from(vector3: Vector3): Vector3Builder;

    public static from(vectorXZ: VectorXZ, y?: number): Vector3Builder;

    public static from(direction: Direction): Vector3Builder;

    public static from(arg0: Vector3 | VectorXZ | Direction, arg1: number = 0): Vector3Builder {
        if (this.isVector3(arg0)) {
            return new this(arg0.x, arg0.y, arg0.z);
        }
        else if (this.isVectorXZ(arg0)) {
            return new this(arg0.x, arg1, arg0.z);
        }
        else if (Object.values(Direction).includes(arg0)) {
            switch (arg0) {
                case Direction.Up: return Vector3Builder.up();
                case Direction.Down: return Vector3Builder.down();
                case Direction.North: return Vector3Builder.back();
                case Direction.South: return Vector3Builder.forward();
                case Direction.East: return Vector3Builder.left();
                case Direction.West: return Vector3Builder.right();
                default: throw new TypeError("Unknown Direction Value");
            }
        }
        else {
            throw new TypeError("Unknown Type Value");
        }
    }

    public static min(a: Vector3, b: Vector3): Vector3Builder {
        return this.from(a).clone().operate(b, (a, b) => Math.min(a, b));
    }

    public static max(a: Vector3, b: Vector3): Vector3Builder {
        return this.from(a).clone().operate(b, (a, b) => Math.max(a, b));
    }
}

export class DualAxisRotationBuilder implements Vector2, IVectorBuilder<DualAxisRotationBuilder> {
    private __yaw__: number;
    private __pitch__: number;

    public constructor(yaw: number, pitch: number) {
        const nonNaNNumber = sentry.number.nonNaN();

        if (!(nonNaNNumber.test(yaw) && nonNaNNumber.test(pitch))) {
            throw new TypeError();
        }

        this.__yaw__ = yaw;
        this.__pitch__ = pitch;
    }

    public get x(): number {
        return this.pitch;
    }

    public set x(value) {
        this.pitch = value;
    } 

    public get y(): number {
        return this.yaw;
    }

    public set y(value) {
        this.yaw = value;
    }

    public get yaw(): number {
        return this.__yaw__;
    }

    public set yaw(value: number) {
        if (!sentry.number.nonNaN().test(value)) {
            throw new TypeError();
        }

        this.__yaw__ = value;
    }

    public get pitch(): number {
        return this.__pitch__;
    }

    public set pitch(value: number) {
        if (!sentry.number.nonNaN().test(value)) {
            throw new TypeError();
        }

        this.__pitch__ = value;
    }

    public equals(other: unknown): boolean {
        if (DualAxisRotationBuilder.isVector2(other)) {
            return this.x === other.x
                && this.y === other.y;
        }
        else return false;
    }

    public operate(callbackFn: (comopnent: number) => number): DualAxisRotationBuilder;

    public operate(other: Vector2, callbackFn: (comopnent1: number, comopnent2: number) => number): DualAxisRotationBuilder;

    public operate(a: Vector2 | ((comopnent: number) => number), b?: (comopnent1: number, comopnent2: number) => number): DualAxisRotationBuilder {
        if (typeof a === "function" && b === undefined) {
            this.__yaw__ = a(this.__yaw__);
            this.__pitch__ = a(this.__pitch__);
        }
        else if (a instanceof DualAxisRotationBuilder && typeof b === "function") {
            this.__yaw__ = b(this.__yaw__, a.__yaw__);
            this.__pitch__ = b(this.__pitch__, a.__pitch__);
        }
        else if (DualAxisRotationBuilder.isVector2(a) && typeof b === "function") {
            this.__yaw__ = b(this.__yaw__, a.y);
            this.__pitch__ = b(this.__pitch__, a.x);
        }
        else {
            throw new TypeError();
        }
        return this;
    }

    public add(other: Vector2): DualAxisRotationBuilder {
        if (!DualAxisRotationBuilder.isVector2(other)) {
            throw new TypeError();
        }

        return this.operate(other, (a, b) => a + b);
    }

    public subtract(other: Vector2): DualAxisRotationBuilder {
        if (!DualAxisRotationBuilder.isVector2(other)) {
            throw new TypeError();
        }

        return this.add(DualAxisRotationBuilder.from(other).clone().invert());
    }

    public scale(scalar: number): DualAxisRotationBuilder {
        if (!sentry.number.nonNaN().test(scalar)) {
            throw new TypeError();
        }

        return this.operate(component => component * scalar);
    }

    public divide(scalar: number): DualAxisRotationBuilder {
        if (!sentry.number.nonNaN().test(scalar)) {
            throw new TypeError();
        }

        if (scalar === 0) {
            throw new TypeError();
        }

        return this.operate(component => component / scalar);
    }

    public invert(): DualAxisRotationBuilder {
        this.__yaw__ += 180;
        this.__pitch__ *= -1;
        return this;
    }

    public clamp(min: DualAxisRotationBuilder, max: DualAxisRotationBuilder): DualAxisRotationBuilder;

    public clamp(min: Vector2, max: Vector2): DualAxisRotationBuilder;

    public clamp(min: Vector2, max: Vector2): DualAxisRotationBuilder {
        if (!(DualAxisRotationBuilder.isVector2(min) && DualAxisRotationBuilder.isVector2(max))) {
            throw new TypeError();
        }

        const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

        this.x = clamp(this.x, min.x, max.x);
        this.y = clamp(this.y, min.y, max.y);

        return this;
    }

    public clone(): DualAxisRotationBuilder {
        return new DualAxisRotationBuilder(this.__yaw__, this.__pitch__);
    }

    public format(format: string, digits: number): string {
        if (!sentry.number.nonNaN().test(digits)) {
            throw new TypeError();
        }
        else if (digits < 0 || digits > 20) {
            throw new RangeError();
        }

        const cx = this.__yaw__.toFixed(digits);
        const cy = this.__pitch__.toFixed(digits);

        return format
            .replace(/\$yaw/g, cx)
            .replace(/\$pitch/g, cy)
            .replace("$c", cx)
            .replace("$c", cy)
            .replace(/\$c/g, "");
    }

    public toString(): string {
        return this.format("($yaw, $pitch)", 1);
    }

    public getDirection3d(): Vector3Builder {
        return new Vector3Builder(
            -Math.sin(this.__yaw__ * Math.PI / 180) * Math.cos(this.__pitch__ * Math.PI / 180),
            -Math.sin(this.__pitch__ * Math.PI / 180),
            Math.cos(this.__yaw__ * Math.PI / 180) * Math.cos(this.__pitch__ * Math.PI / 180)
        );
    }

    public isZero(): boolean {
        return this.equals(DualAxisRotationBuilder.zero());
    }

    public freeze(): ReadonlyVector2 {
        return Object.freeze({ x: this.x, y: this.y });
    }

    public static isVector2(value: unknown): value is Vector2 {
        return sentry.objectOf({
            x: sentry.number.nonNaN(),
            y: sentry.number.nonNaN()
        }).test(value);
    }

    public static zero(): DualAxisRotationBuilder {
        return new this(0, 0);
    }

    public static filled(value: number): DualAxisRotationBuilder {
        return new this(value, value);
    }

    public static from(vector2: Vector2): DualAxisRotationBuilder {
        return new this(vector2.y, vector2.x);
    }
}

export class TripleAxisRotationBuilder implements IVectorBuilder<TripleAxisRotationBuilder> {
    private __yaw__: number;
    private __pitch__: number;
    private __roll__: number;

    public constructor(yaw: number, pitch: number, roll: number) {
        const nonNaNNumber = sentry.number.nonNaN();

        if (!(nonNaNNumber.test(yaw) && nonNaNNumber.test(pitch) && nonNaNNumber.test(roll))) {
            throw new TypeError();
        }

        this.__yaw__ = yaw;
        this.__pitch__ = pitch;
        this.__roll__ = roll;
    }

    public get x(): number {
        return this.pitch;
    }

    public set x(value) {
        this.pitch = value;
    } 

    public get y(): number {
        return this.yaw;
    }

    public set y(value) {
        this.yaw = value;
    }

    public get yaw(): number {
        return this.__yaw__;
    }

    public set yaw(value: number) {
        if (!sentry.number.nonNaN().test(value)) {
            throw new TypeError();
        }

        this.__yaw__ = value;
    }

    public get pitch(): number {
        return this.__pitch__;
    }

    public set pitch(value: number) {
        if (!sentry.number.nonNaN().test(value)) {
            throw new TypeError();
        }

        this.__pitch__ = value;
    }

    public get roll(): number {
        return this.__roll__;
    }

    public set roll(value: number) {
        if (!sentry.number.nonNaN().test(value)) {
            throw new TypeError();
        }

        this.__roll__ = value;
    }

    public equals(other: unknown): boolean {
        if (other instanceof TripleAxisRotationBuilder) {
            return this.__yaw__ === other.__yaw__
                && this.__pitch__ === other.__pitch__
                && this.__roll__ === other.__roll__;
        }
        else return false;
    }

    public operate(callbackFn: (comopnent: number) => number): TripleAxisRotationBuilder;

    public operate(other: TripleAxisRotationBuilder, callbackFn: (comopnent1: number, comopnent2: number) => number): TripleAxisRotationBuilder;

    public operate(a: TripleAxisRotationBuilder | ((comopnent: number) => number), b?: (comopnent1: number, comopnent2: number) => number): TripleAxisRotationBuilder {
        if (typeof a === "function" && b === undefined) {
            this.__yaw__ = a(this.__yaw__);
            this.__pitch__ = a(this.__pitch__);
            this.__roll__ = a(this.__roll__);
        }
        else if (a instanceof TripleAxisRotationBuilder && typeof b === "function") {
            this.__yaw__ = b(this.__yaw__, a.__yaw__);
            this.__pitch__ = b(this.__pitch__, a.__pitch__);
            this.__roll__ = b(this.__roll__, a.__roll__);
        }
        else {
            throw new TypeError();
        }
        return this;
    }

    public add(other: TripleAxisRotationBuilder): TripleAxisRotationBuilder {
        return this.operate(other, (a, b) => a + b);
    }

    public subtract(other: TripleAxisRotationBuilder): TripleAxisRotationBuilder {
        return this.add(TripleAxisRotationBuilder.from(other).clone().invert());
    }

    public scale(scalar: number): TripleAxisRotationBuilder {
        if (!sentry.number.nonNaN().test(scalar)) {
            throw new TypeError();
        }

        return this.operate(component => component * scalar);
    }

    public divide(scalar: number): TripleAxisRotationBuilder {
        if (!sentry.number.nonNaN().test(scalar)) {
            throw new TypeError();
        }

        if (scalar === 0) {
            throw new TypeError();
        }

        return this.operate(component => component / scalar);
    }

    public invert(): TripleAxisRotationBuilder {
        const rotation: TripleAxisRotationBuilder = this.getObjectCoordsSystem().back();
        this.__yaw__ = rotation.__yaw__;
        this.__pitch__ = rotation.__pitch__;
        this.__roll__ = rotation.__roll__;
        return this;
    }

    public clamp(min: TripleAxisRotationBuilder, max: TripleAxisRotationBuilder): TripleAxisRotationBuilder  {
        const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

        this.x = clamp(this.x, min.x, max.x);
        this.y = clamp(this.y, min.y, max.y);

        if (min instanceof TripleAxisRotationBuilder && max instanceof TripleAxisRotationBuilder) {
            this.__roll__ = clamp(this.__roll__, min.__roll__, max.__roll__);
        }

        return this;
    }

    public clone(): TripleAxisRotationBuilder {
        return new TripleAxisRotationBuilder(this.__yaw__, this.__pitch__, this.__roll__);
    }

    public format(format: string, digits: number): string {
        if (!sentry.number.nonNaN().test(digits)) {
            throw new TypeError();
        }
        else if (digits < 0 || digits > 20) {
            throw new RangeError();
        }

        const cx = this.__yaw__.toFixed(digits);
        const cy = this.__pitch__.toFixed(digits);
        const cz = this.__roll__.toFixed(digits);

        return format
            .replace(/\$yaw/g, cx)
            .replace(/\$pitch/g, cy)
            .replace(/\$roll/g, cz)
            .replace("$c", cx)
            .replace("$c", cy)
            .replace("$c", cz)
            .replace(/\$c/g, "");
    }

    public toString(): string {
        return this.format("($yaw, $pitch, $roll)", 1);
    }

    public getDirection3d(): Vector3Builder {
        return new Vector3Builder(
            -Math.sin(this.__yaw__ * Math.PI / 180) * Math.cos(this.__pitch__ * Math.PI / 180),
            -Math.sin(this.__pitch__ * Math.PI / 180),
            Math.cos(this.__yaw__ * Math.PI / 180) * Math.cos(this.__pitch__ * Math.PI / 180)
        );
    }

    public getObjectCoordsSystem() {
        return new TripleAxisRotationBuilder.ObjectCoordsSystem(this);
    }

    public isZero(): boolean {
        return this.equals(TripleAxisRotationBuilder.zero());
    }

    public static zero(): TripleAxisRotationBuilder {
        return new this(0, 0, 0);
    }

    public static filled(value: number): TripleAxisRotationBuilder {
        return new this(value, value, value);
    }

    public static from(vector2: Vector2, zAngle: number = 0): TripleAxisRotationBuilder {
        return new this(vector2.y, vector2.x, zAngle);
    }

    private static readonly ObjectCoordsSystem = class ObjectCoordsSystem {
        private readonly __rotation__: TripleAxisRotationBuilder;

        public constructor(rotation: TripleAxisRotationBuilder) {
            this.__rotation__ = rotation.clone();
        }

        public getX(): Vector3Builder {
            const forward: Vector3Builder = this.getZ();
    
            return new Vector3Builder(forward.z, 0, -forward.x)
                .normalize()
                .rotate(forward, this.__rotation__.roll);
        }
    
        public getY(): Vector3Builder {
            return this.getZ().cross(this.getX());
        }
    
        public getZ(): Vector3Builder {
            return this.__rotation__.getDirection3d();
        }
    
        public forward(): TripleAxisRotationBuilder {
            return this.__rotation__.clone();
        }
    
        public back(): TripleAxisRotationBuilder {
            return TripleAxisRotationBuilder.ObjectCoordsSystem.ofAxes(
                this.getX().invert(),
                this.getY()
            );
        }
    
        public left(): TripleAxisRotationBuilder {
            return TripleAxisRotationBuilder.ObjectCoordsSystem.ofAxes(
                this.getZ().invert(),
                this.getY()
            );
        }
    
        public right(): TripleAxisRotationBuilder {
            return TripleAxisRotationBuilder.ObjectCoordsSystem.ofAxes(
                this.getZ(),
                this.getY()
            );
        }
    
        public up(): TripleAxisRotationBuilder {
            return TripleAxisRotationBuilder.ObjectCoordsSystem.ofAxes(
                this.getX(),
                this.getZ().invert()
            );
        }
    
        public down(): TripleAxisRotationBuilder {
            return TripleAxisRotationBuilder.ObjectCoordsSystem.ofAxes(
                this.getX(),
                this.getZ()
            );
        }

        private static ofAxes(x: Vector3Builder, y: Vector3Builder): TripleAxisRotationBuilder {
            const z = x.cross(y);
    
            return new TripleAxisRotationBuilder(
                Math.atan2(-z.x, z.z) * 180 / Math.PI,
                Math.asin(-z.y) * 180 / Math.PI,
                Math.atan2(x.y, y.y) * 180 / Math.PI
            );
        }
    }
}
