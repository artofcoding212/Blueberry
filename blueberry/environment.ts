import { RuntimeValue, StringValue, NativeMethodValue, NumberValue, ObjectValue } from "./values.ts";
import { Scopes, Interpreter } from './interpreter.ts';

export interface Variable {
    value: RuntimeValue,
    global: boolean,
    constant?: boolean,
    scope?: string
}

export class Environment {
    private parent?: Environment;
    private variables: Map<string, Variable> = new Map();
    private interpreter?: Interpreter;

    public constructor(parent?: Environment) {
        this.parent = parent;

        if (!parent) {
            this.interpreter = new Interpreter();

            this.declare('tostring', {value: {type: 'NativeMethod', 
                call: (args: Array<RuntimeValue>, _scopes: Scopes) => {
                    let value = '';

                    if (args.length == 0) {
                        throw 'The tostring() method requires at least 1 argument.';
                    }

                    for (const argument of args) {
                        if (value == '') {
                            value = (this.interpreter as Interpreter).stringify(argument);
                        } else {
                            value = value + (this.interpreter as Interpreter).stringify(argument);
                        }
                    }

                    return {type: 'String', value} as StringValue;
                }
            } as NativeMethodValue, global: true});

            this.declare('tonumber', {value: {type: 'NativeMethod', 
                call: (args: Array<RuntimeValue>, _scopes: Scopes) => {
                    let value = '';

                    if (args.length == 0) {
                        throw 'The tonumber() method requires at least 1 argument.';
                    }

                    for (const argument of args) {
                        if (value == '') {
                            value = (this.interpreter as Interpreter).stringify(argument);
                        } else {
                            value = value + (this.interpreter as Interpreter).stringify(argument);
                        }
                    }

                    return {type: 'Number', value: Number(value)} as NumberValue;
                }
            } as NativeMethodValue, global: true});

            this.declare('random', {value: {type: 'NativeMethod', 
                call: (args: Array<RuntimeValue>, _scopes: Scopes) => {
                    if (args.length != 2) {
                        throw 'The random() method requires at 2 arguments.';
                    }

                    if (args[0].type != 'Number' || args[1].type != 'Number') {
                        throw 'The random() method requires two numbers.'
                    }

                    const minimum = (args[1] as NumberValue).value;

                    return {type: 'Number', value: Math.floor(Math.random() * ((args[0] as NumberValue).value - minimum + 1)) + minimum} as NumberValue;
                }
            } as NativeMethodValue, global: true});

            this.declare('utility', {value: {
                type: 'Object',
                properties: new Map<string, RuntimeValue>()
                    .set('time', {'type': 'NativeMethod',
                        call: (args: Array<RuntimeValue>, _scopes: Scopes) => {
                            if (args.length > 0) {
                                throw `The utility.time() method takes in 0 arguments, but ${args.length} arguments were given.`;
                            }

                            return {type: 'Number', value: Date.now()} as NumberValue;
                        }
                    } as NativeMethodValue)
            } as ObjectValue, global: true});

            this.declare('console', {value: {
                type: 'Object',
                properties: new Map<string, RuntimeValue>()
                    .set('input', {'type': 'NativeMethod',
                        call: (args: Array<RuntimeValue>, _scopes: Scopes) => {
                            if (args.length != 1) {
                                throw `The console.input() method takes in 1 argument, but ${args.length} arguments were given.`;
                            }

                            if (args[0].type != 'String') {
                                throw `Expected the first argument of console.input() to be a string.`;
                            }

                            return {type: 'String', value: prompt((args[0] as StringValue).value)} as StringValue;
                        }
                    } as NativeMethodValue)
                    .set('log', {'type': 'NativeMethod',
                        call: (args: Array<RuntimeValue>, _scopes: Scopes) => {
                            if (args.length < 1) {
                                throw `The console.log() method takes in at least 1 argument, but ${args.length} arguments were given.`;
                            }

                            let output: string | undefined = undefined;

                            for (const argument of args) {
                                const value = (this.interpreter as Interpreter).stringify(argument);
                                if (output == undefined) {
                                    output = value;
                                    continue;
                                }

                                output = `${output} ${value}`;
                            }

                            return {type: 'String', value: output as string} as StringValue;
                        }
                    } as NativeMethodValue)
            } as ObjectValue, global: true});
        }
    }

    public resolve(name: string): Environment | undefined {
        if (this.variables.has(name)) {
            return this;
        }

        if (typeof this.parent == 'undefined') {
            return undefined;
        }

        return (this.parent as Environment).resolve(name);
    }

    public tryLookup(name: string): Variable | undefined {
        const environment = this.resolve(name);

        return (typeof environment == 'undefined') ? undefined : environment.variables.get(name) as Variable;
    }

    public lookup(name: string): Variable {
        const environment = this.resolve(name);

        if (typeof environment == 'undefined') {
            throw `Cannot find the variable ${name} as it does not exist.`;
        }

        return (environment as Environment).variables.get(name) as Variable;
    }

    public declare(name: string, variable: Variable): Variable {
        if (this.variables.has(name)) {
            throw `Cannot delcare variable ${name} as it is already defined.`;
        }

        this.variables.set(name, variable);

        return variable;
    }

    public assign(name: string, value: RuntimeValue): RuntimeValue {
        const environment = this.resolve(name);
        let variable = {value} as Variable;

        if (typeof environment == 'undefined') {
            this.variables.set(name, variable);
        } else {
            variable = environment.variables.get(name) as Variable;
            if (variable.constant == true) {
                throw 'Cannot assign a constant variable.';
            }
            variable.value = value;
            
            environment.variables.set(name, variable);
        }

        return value;
    }
}