import { Environment } from './environment.ts';
import { Stmt } from './ast.ts';
import {Scopes} from './interpreter.ts';

export type ValueType = 
    | 'Boolean' 
    | 'Number'
    | 'String'
    | 'None'
    | 'Object'
    | 'Array'
    | 'Print'
    | 'NativeMethod'
    | 'Function'
    | 'Method'
    | 'If'
    | 'While'
    | 'Class'
    | 'Constructor'
    | 'ClassMethod'
    | 'ClassVariable'

export interface RuntimeValue {
    type: ValueType
}

export interface NoneValue extends RuntimeValue {
    type: 'None',
    value: null
}

export interface NumberValue extends RuntimeValue {
    type: 'Number',
    value: number
}

export interface StringValue extends RuntimeValue {
    type: 'String',
    value: string
}

export interface BooleanValue extends RuntimeValue {
    type: 'Boolean',
    value: boolean
}

export interface ObjectValue extends RuntimeValue {
    type: 'Object',
    properties: Map<string, RuntimeValue>
}

export interface ArrayValue extends RuntimeValue {
    type: 'Array',
    properties: Array<RuntimeValue>
}

export interface PrintValue extends RuntimeValue {
    type: 'Print',
    value: string
}

export type FunctionCall = (args: Array<RuntimeValue>, scopes: Scopes) => RuntimeValue;
export interface NativeMethodValue extends RuntimeValue {
    type: 'NativeMethod',
    call: FunctionCall
}

export interface MethodValue extends RuntimeValue {
    type: 'Method',
    parameters: Array<string>,
    body: Array<Stmt>,
    minimumLength: number,
    infiniteName?: string,
    environment: Environment
}

export interface FunctionValue extends RuntimeValue {
    type: 'Function',
    name: string,
    parameters: Array<string>,
    environment: Environment,
    minimumLength: number,
    infiniteName?: string,
    body: Array<Stmt>
}

export interface ConstructorValue extends RuntimeValue {
    type: 'Constructor',
    parameters: Array<string>,
    environment: Environment,
    minimumLength: number,
    infiniteName?: string,
    body: Array<Stmt>
}

export interface ClassMethodValue extends RuntimeValue {
    type: 'ClassMethod',
    name: string
    parameters: Array<string>,
    environment: Environment,
    createSelf: ((inPublic?: boolean) => RuntimeValue) | undefined,
    minimumLength: number,
    infiniteName?: string,
    body: Array<Stmt>,
    isPrivate: boolean,
    isStatic: boolean
}

export interface ClassVariableValue extends RuntimeValue {
    type: 'ClassVariable',
    environment: Environment,
    isPrivate: boolean,
    isReadonly: boolean,
    name: string,
    value: RuntimeValue
}

export interface ClassValue extends RuntimeValue {
    type: 'Class',
    name: string,
    initializer?: RuntimeValue,
    publicVariables: Array<RuntimeValue>,
    privateVariables: Array<RuntimeValue>,
    environment: Environment
}