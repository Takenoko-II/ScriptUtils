export class Serializable {
    public serialize(): string {
        return Serializable.any(this, 1);
    }

    private static boolean(boolean: boolean): string {
        return String(boolean);
    }

    private static number(number: number): string {
        return String(number);
    }

    private static bigint(bigint: bigint): string {
        return String(bigint);
    }

    private static string(string: string): string {
        return '"' + string + '"';
    }

    private static symbol(symbol: symbol): string {
        return symbol.description === ""
            ? "symbol()"
            : `symbol("${symbol.description}")`;
    }

    private static function(__function__: Function): string {
        const code: string = __function__.toString();

        if (code.startsWith("function")) {
            return "function " + __function__.name + "() {...}";
        }
        else if (code.startsWith("async")) {
            return "async function " + __function__.name + "() {...}";
        }
        else if (code.startsWith("class")) {
            return "class " + __function__.name + " {...}";
        }
        else {
            return __function__.name + "() {...}";
        }
    }

    private static object(object: object, indentation: number): string {
        if (Array.isArray(object)) {
            return this.array(object, indentation);
        }

        let str: string = "{";

        const keys: string[] = Object.keys(object);

        for (let i = 0; i < keys.length; i++) {
            const key: string = keys[i];
            const value: string = this.any(object[key], indentation + 1);

            str += "\n" + "    ".repeat(indentation) + `"${key}": ${value}`;

            if (i < keys.length - 1) {
                str += ",";
            }
        }

        const prototype = Object.getPrototypeOf(object);

        if (Object.keys(prototype).length > 0) {
            str += ",\n" + "    ".repeat(indentation) + `[[Prototype]]: ${this.object(prototype, indentation + 1)}`;
        }

        if (Object.keys(object).length > 0) {
            str += "\n";
        }

        str += "    ".repeat(indentation - 1) + "}";

        return str;
    }

    private static array(array: any[], indentation: number): string {
        let str: string = "[";

        for (let i = 0; i < array.length; i++) {
            const value: string = this.any(array[i], indentation);

            str += "\n" + "    ".repeat(indentation) + value;

            if (i < array.length - 1) {
                str += ",";
            }
        }

        const prototype = Object.getPrototypeOf(array);

        if (Object.keys(prototype).length > 0) {
            str += ",\n" + "    ".repeat(indentation) + `[[Prototype]]: ${this.object(prototype, indentation)}`;
        }

        if (array.length > 0) {
            str += "\n";
        }

        str += "    ".repeat(indentation - 1) + "]";

        return str;
    }

    private static any(any: any, indentation: number): string {
        switch (typeof any) {
            case "boolean":
                return this.boolean(any);
            case "number":
                return this.number(any);
            case "bigint":
                return this.bigint(any);
            case "string":
                return this.string(any);
            case "symbol":
                return this.symbol(any);
            case "undefined":
                return this.UNDEFINED;
            case null:
                return this.NULL;
            case "function":
                return this.function(any);
            case "object":
                return this.object(any, indentation);
        }
    }

    private static readonly UNDEFINED: string = "undefined";

    private static readonly NULL: string = "null";
}
