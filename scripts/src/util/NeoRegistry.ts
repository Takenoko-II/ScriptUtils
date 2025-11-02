import { sentry, TypeModel } from "../lib/TypeSentry";
import { AbstractParser } from "./AbstractParser";

class Identifier {
    public constructor(public readonly namespace: string, public readonly value: string) {}

    public equals(other: Identifier): boolean {
        return this.namespace === other.namespace && this.value === other.value;
    }

    public toString(): string {
        return this.namespace + ':' + this.value;
    }

    public static of(string: string): Identifier {
        return IdentifierParser.readIdentifier(string);
    }
}

class IdentifierParseError extends Error {}

class IdentifierParser extends AbstractParser<Identifier, IdentifierParseError> {
    private constructor(text: string, private readonly defaultNamespace?: string) {
        super(text);
    }

    protected override getErrorConstructor(): new (message: string, cause?: Error) => IdentifierParseError {
        return IdentifierParseError;
    }

    protected override getQuotes(): Set<string> {
        return new Set(['\'', '"']);
    }

    protected override getWhitespace(): Set<string> {
        return new Set([' ']);
    }

    protected override getFalse(): string {
        return "false";
    }

    protected override getTrue(): string {
        return "true";
    }

    private first(): { readonly first: string; readonly hasSecond: boolean } {
        if (this.test(true, ...this.getQuotes())) {
            const str = this.quotedString(true);
            return {
                hasSecond: this.test(false, ':') !== undefined,
                first: str
            };
        }

        const str = this.unquotedString(true, ':');
        return {
            hasSecond: !this.isOnlyWhitespaceRemaining(),
            first: str
        };
    }

    private second(): string {
        if (this.isOver()) {
            return '';
        }

        if (this.test(false, ...this.getQuotes())) {
            const str = this.quotedString(true);
            return str;
        }

        return this.unquotedString(false);
    }

    protected override parse(): Identifier {
        const { hasSecond, first } = this.first();

        let namespace: string;
        let value: string;

        if (hasSecond) {
            namespace = first;
            value = this.second();
        }
        else {
            if (this.defaultNamespace) namespace = this.defaultNamespace;
            else throw this.exception("名前空間がありません");
            value = first;
        }

        this.finish();

        return new Identifier(namespace, value);
    }

    public static readDeaultedIdentifier(defaultNamespace: string, string: string): Identifier {
        return new IdentifierParser(string, defaultNamespace).parse();
    }

    public static readIdentifier(string: string): Identifier {
        return new IdentifierParser(string).parse();
    }
}

class RegistryError extends Error {}

class RegistryKey<V> {
    protected constructor(protected readonly registry: Registry<V>, protected readonly identifier: Identifier) {}

    public getRegistry(): Registry<V> {
        return this.registry;
    }

    public getIdentifier() {
        return this.identifier;
    }

    public equals(other: RegistryKey<V>): boolean {
        return this.registry === other.registry && this.identifier.equals(other.identifier);
    }

    public static of<V>(registry: Registry<V>, identifier: Identifier): RegistryKey<V> {
        return new RegistryKey(registry, identifier);
    }
}

class RegistryEntry<V> {
    public constructor(public readonly identifier: Identifier, public readonly value: V) {}
}

class Registry<V> {
    private readonly key: RegistryKey<V>;

    private readonly entries = new Set<RegistryEntry<V>>();

    public constructor(protected identifier: Identifier, protected readonly type: TypeModel<V>) {
        this.key = RegistryKey.of(this, identifier);
    }

    public getKey(): RegistryKey<V> {
        return this.key;
    }

    public has(identifier: Identifier): boolean {
        for (const entry of this.entries) {
            if (entry.identifier.equals(identifier)) {
                return true;
            }
        }

        return false;
    }

    public register(identifier: Identifier, value: V): RegistryEntry<V> {
        if (this.has(identifier)) {
            throw new RegistryError("使用済みのIDです: " + value);
        }

        if (!this.type.test(value)) {
            throw new RegistryError("不正な型の値です: " + value);
        }

        const entry = new RegistryEntry(identifier, value);
        this.entries.add(entry);
        return entry;
    }

    public unregister(identifier: Identifier): RegistryEntry<V> {
        if (!this.has(identifier)) {
            throw new RegistryError("存在しないキーです: " + identifier);
        }

        for (const entry of this.entries) {
            if (entry.identifier.equals(identifier)) {
                this.entries.delete(entry);
                return entry;
            }
        }

        throw new RegistryError("NEVER HAPPENS");
    }

    public get(identifier: Identifier): V {
        if (!this.has(identifier)) {
            throw new RegistryError("存在しないキーです: " + identifier);
        }

        for (const entry of this.entries) {
            if (entry.identifier.equals(identifier)) {
                return entry.value;
            }
        }

        throw new RegistryError("NEVER HAPPENS");
    }
}

interface RegistryRegistrar<V> {
    readonly type: TypeModel<V>;

    register: (registry: Registry<V>) => void;
}

type RegistriesInitializer = {
    readonly [key: string]: RegistryRegistrar<unknown>;
};

type InitializerToRegistries<T extends Record<string, RegistryRegistrar<unknown>>> = {
    readonly [K in keyof T]: T[K] extends RegistryRegistrar<infer V> ? Registry<V> : never;
};

class Registries<const T extends RegistriesInitializer, S extends InitializerToRegistries<T>> {
    private readonly registries: S;

    public constructor(initializer: T) {
        const r: Record<string, Registry<unknown>> = {};

        for (const [identifier, registrar] of Object.entries(initializer)) {
            const registry = new Registry(Identifier.of(identifier), registrar.type);
            r[identifier] = registry;
        }

        this.registries = r as S;
    }

    public getRegistry<K extends keyof S>(identifier: K): S[K] {
        return this.registries[identifier];
    }
}

const r = new Registries({
    "a": {
        type: sentry.number,
        register(registry) {
            
        }
    },
    "b": {
        type: sentry.string,
        register() {

        }
    }
});
