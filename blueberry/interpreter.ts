import {
    RuntimeValue,
    NumberValue,
    NoneValue,
    BooleanValue,
    ObjectValue,
    StringValue,
    ArrayValue,
    PrintValue,
    FunctionValue,
    NativeMethodValue,
    MethodValue,
    ClassMethodValue,
    ClassValue,
    ClassVariableValue,
    ConstructorValue
} from './values.ts';

import {
    Stmt,
    NumericLiteral,
    BooleanLiteral,
    BinaryExpr,
    Program,
    Identifier,
    VariableDeclaration,
    AssignmentExpr,
    ReturnStmt,
    ObjectExpr,
    StringLiteral,
    Expr,
    ArrayExpr,
    CallExpr,
    PrintStmt,
    FunctionDeclaration,
    UnaryExpr,
    BlockStmt,
    IfStmt,
    DoExpr,
    WhileStmt,
    ForStmt,
    LogicalExpr,
    MemberExpr,
    ClassDeclaration,
    ClassMethod,
    ClassVariable,
    NewExpr
} from './ast.ts';

import {Environment} from './environment.ts';

export interface Scopes {
    current: Environment,
    global: Environment
}

export class Interpreter {
    public logs: Array<string> = new Array<string>();
    private haltPrints: boolean;

    public constructor(haltPrints = false) {
        this.haltPrints = haltPrints;
    }

    public interpret(node: Stmt, scopes: Scopes): RuntimeValue {
        switch(node.kind) {
            case 'Program': {
                return this.evaluateProgram(node as Program, scopes);
            }
            case 'Identifier': {
                return scopes.current.lookup((node as Identifier).symbol).value;
            }
            case 'NumericLiteral': {
                return {type: 'Number', value: (node as NumericLiteral).value} as NumberValue;
            }
            case 'BinaryExpr': {
                return this.evaluateBinaryExpr(node as BinaryExpr, scopes);
            }
            case 'NoneLiteral': {
                return {type: 'None', value: null} as NoneValue;
            }
            case 'BooleanLiteral': {
                return {type: 'Boolean', value: (node as BooleanLiteral).value} as BooleanValue;
            }
            case 'ClassDeclaration': {
                return this.evaluateClassDeclaration(node as ClassDeclaration, scopes);
            }
            case 'VariableDeclaration': {
                const variable = node as VariableDeclaration;
                
                if (variable.global == true) {
                    return scopes.global.declare(variable.identifier, {
                        value: variable.value ? this.interpret(variable.value, scopes) : {type: 'None', value: null} as NoneValue,
                        scope: variable.scope,
                        global: true,
                    }).value;
                }

                return scopes.current.declare(variable.identifier, {
                    value: variable.value ? this.interpret(variable.value, scopes) : {type: 'None', value: null} as NoneValue,
                    scope: variable.scope,
                    global: false,
                }).value;
            }
            case 'AssignmentExpr': {
                return this.evaluateAssignmentExpr(node as AssignmentExpr, scopes);
            }
            case 'StringLiteral': {
               return {type: 'String', value: (node as StringLiteral).value} as StringValue;
            }
            case 'InfiniteExpr': {
                throw 'Infinite expressions can only be present within functions.';
            }
            case 'DoExpr': {
                return this.evaluateBlock((node as DoExpr).body, scopes);
            }
            case 'ArrayExpr': {
                const array = node as ArrayExpr;
                const properties = new Array<RuntimeValue>();

                for (const value of array.properties) {
                    if (value.value.kind == 'Identifier') {
                        const variable = scopes.current.lookup((value.value as Identifier).symbol);
                        properties.push(variable.value);

                        continue;
                    }

                    properties.push(this.interpret(value.value, scopes));
                }

                return {type: 'Array', properties} as ArrayValue;
            }
            case 'ObjectExpr': {
                const object = node as ObjectExpr;
                const properties = new Map<string, RuntimeValue>();

                for (const {key, value} of object.properties) {
                    properties.set(key, (typeof value == 'undefined') ? scopes.current.lookup(key).value : this.interpret(value as Expr, scopes));
                }

                return {type: 'Object', properties} as ObjectValue;
            }
            case 'CallExpr': {
                return this.evaluateCallExpr(node as CallExpr, scopes);
            }
            case 'PrintStmt': {
                const print = node as PrintStmt;
                let output = '';

                for (const value of print.output) {
                    if (output.length == 0) {
                        output = this.stringify(this.interpret(value, scopes));
                    } else {
                        output = output + this.stringify(this.interpret(value, scopes));
                    }
                }

                this.logs.push(output);
                
                if (this.haltPrints == false) {
                    console.log(output);
                }

                return {type: 'Print', value: output} as PrintValue;
            }
            case 'FunctionDeclaration': {
                return this.evaluateFunctionDeclaration(node as FunctionDeclaration, scopes);
            }
            case 'UnaryExpr': {
                return this.evaluateUnaryExpr(node as UnaryExpr, scopes);
            }
            case 'BlockStmt': {
                return this.evaluateBlock(node as BlockStmt, scopes);
            }
            case 'ReturnStmt': {
                throw 'A return statement can only be present within methods.';
            }
            case 'IfStmt': {
                const result = this.evaluateIfStmt(node as IfStmt, scopes);
                return result == null ? {type: 'None', value: null} as NoneValue : result;
            }
            case 'WhileStmt': {
                return this.evaluateWhileStmt(node as WhileStmt, scopes);
            }
            case 'ForStmt': {
                return this.evaluateForStatement(node as ForStmt, scopes);
            }
            case 'LogicalExpr': {
                return this.evaluateLogicalExpr(node as LogicalExpr, scopes);
            }
            case 'MemberExpr': {
                const member = node as MemberExpr;
                const variable = this.interpret(member.object, scopes);

                switch(variable.type) {
                    case 'Array': {
                        if (member.computed == false) {
                            throw 'Cannot get a non-computed property from an array.';
                        }
    
                        const index = this.interpret(member.property, scopes);
                        if (index.type != 'Number') {
                            throw `Expected a array property access to be a number, instead got a ${index.type}.`;
                        }
    
                        try {
                            return (variable as ArrayValue).properties[(index as NumberValue).value];
                        } catch {
                            throw `Array index ${(index as NumberValue).value} does not exist.`;
                        }
                    }
                    case 'Object': {
                        if (member.property.kind == 'Identifier' && member.computed == false) {
                            const result = (variable as ObjectValue).properties.get((member.property as Identifier).symbol);

                            if (result == undefined) {
                                throw `Object key ${(member.property as Identifier).symbol} does not exist.`;
                            }

                            return result;
                        }

                        const result = (variable as ObjectValue).properties.get(this.stringify(this.interpret(member.property, scopes)));

                        if (result == undefined) {
                            if (member.computed == false) {
                                throw `Object key ${(member.property as Identifier).symbol} does not exist.`;
                            }

                            return {type: 'None', value: null} as NoneValue;
                        }

                        return result;
                    }
                    default:
                        throw `Expected a property access to be a array or object, instead got a ${variable.type}.`;
                }
            }
            case 'NewExpr': {
                return this.evaluateNewExpr(node as NewExpr, scopes);
            }
            default: {
                throw `Unexpected AST type ${node.kind} whilst interpreting.`;
            }
        }
    }

    public numberify(node: RuntimeValue): number {
        switch(node.type) {
            case 'Array':
                return (node as ArrayValue).properties.length;
            case 'Object': {
                let result = 0;

                (node as ObjectValue).properties.forEach((value, _key) => {
                    result += (value ? 2 : 1);
                });

                return result;
            }
            case 'Number':
                return (node as NumberValue).value;
            case 'String':
                return Number((node as StringValue).value);
            case 'Boolean':
                return (node as BooleanValue).value == true ? 1 : 0;
            case 'None':
                return 0;
            default:
                throw `Type ${node.type} cannot be transformed into a number.`;
        }
    }

    public stringify(node: RuntimeValue, indentation = 0): string {
        if (indentation > 3) {
            return '[Object]';
        }

        switch(node.type) {
            case 'Array': {
                let result = '[';

                (node as ObjectValue).properties.forEach((value) => {
                    if (result == '[') {
                        result = `[ ${value.type == 'String' ? '"' + this.stringify(value, indentation + 1) + '"' : this.stringify(value, indentation + 1)}`;
                        return;
                    }

                    result = `${result}, ${value.type == 'String' ? '"' + this.stringify(value, indentation + 1) + '"' : this.stringify(value, indentation + 1)}`;
                });

                result = `${result} ]`;

                return result;
            }
            case 'Object': {
                let result = '{';

                (node as ObjectValue).properties.forEach((value, key) => {
                    if (result == '{') {
                        result = `{ ${key}: ${value.type == 'String' ? '"' + this.stringify(value, indentation + 1) + '"' : this.stringify(value, indentation + 1)}`;
                        return;
                    }

                    result = `${result}, ${key}: ${value.type == 'String' ? '"' + this.stringify(value, indentation + 1) + '"' : this.stringify(value, indentation + 1)}`;
                });

                result = `${result} }`;

                return result;
            }
            case 'Method': {
                return `[Method]: (${(node as MethodValue).parameters.join(',')}) => any`;
            }
            case 'ClassMethod': {
                return `${(node as ClassMethodValue).name}: (${(node as MethodValue).parameters.join(',')}) => any`;
            }
            case 'NativeMethod': {
                return `[NativeMethod]`;
            }
            case 'None':
                return 'none';
            case 'Boolean':
                return (node as BooleanValue).value == true ? 'true' : 'false';
            case 'String':
                return (node as StringValue).value;
            case 'Number': {
                const numberString = (node as NumberValue).value.toString();

                if (numberString.endsWith('.0')) {
                    return numberString.substring(0,  numberString.length - 2);
                }

                return numberString;
            }
            default:
                throw `Type ${node.type} cannot be transformed into a string.`;
        }
    }

    private isTrue(node: RuntimeValue): boolean {
        switch(node.type) {
            case 'None':
                return false;
            case 'Boolean':
                return (node as BooleanValue).value;
            default:
                return true;
        }
    }

    private evaluateCode(body: Array<Stmt>, scopes: Scopes): RuntimeValue | null {
        for (const statement of body) {
            if (statement.kind == "ReturnStmt") {
                return this.interpret((statement as ReturnStmt).value, scopes);
            } else if (statement.kind == "IfStmt") {
                const value = statement as IfStmt;
                const thenResult = this.evaluateIfStmt(value, scopes);

                if (thenResult != null) {
                    return thenResult;
                }

                if (value.elseBranch && value.elseBranch.kind == 'IfStmt') {
                    return this.evaluateIfStmt(value.elseBranch as IfStmt, scopes);
                }

                continue;
            }

            if ("body" in statement) {
                return this.interpret(statement, scopes);
            }

            this.interpret(statement, scopes);
        }

        return null;
    }

    private evaluateBlock(block: BlockStmt, scopes: Scopes): RuntimeValue {
        const result = this.evaluateCode(block.body, {"global": scopes.global, "current": new Environment(scopes.current)});
        return result == null ? {type: 'None', value: null} as NoneValue : result;
    }

    private evaluateClassDeclaration(declarator: ClassDeclaration, scopes: Scopes): RuntimeValue {
        const parentScope = new Environment(scopes.current);
        const publicVariables = new Array<RuntimeValue>();
        const privateVariables = new Array<RuntimeValue>();
        let initializer: RuntimeValue | undefined = undefined;

        if (declarator.initializer != undefined) {
            const main = declarator.initializer as ClassMethod;
            initializer = {type: 'Constructor', parameters: main.parameters, environment: parentScope, minimumLength: main.minimumLength, infiniteName: main.infiniteName, body: main.body} as ConstructorValue;
        }

        declarator.publicVariables.forEach((variable, _index) => {
            switch(variable.kind) {
                case 'ClassMethod': {
                    const method = variable as ClassMethod;
                    publicVariables.push({type: 'ClassMethod', name: method.name as string, parameters: method.parameters, environment: parentScope, minimumLength: method.minimumLength, infiniteName: method.infiniteName, body: method.body, isPrivate: false, isStatic: method.isStatic} as ClassMethodValue);
                    break;
                }
                case 'ClassVariable': {
                    const main = variable as ClassVariable;
                    const variableValue = main.value == undefined ? undefined : this.interpret(main.value, scopes);
                    publicVariables.push({type: 'ClassVariable', name: main.identifier, environment: parentScope, isPrivate: false, isReadonly: main.isReadonly, value: variableValue} as ClassVariableValue);
                    break;
                }
                default:
                    throw `Expected a class method or a class variable within the public variables of a class, instead got a ${variable.kind}.`;
            }
        });

        declarator.privateVariables.forEach((variable, _index) => {
            switch(variable.kind) {
                case 'ClassMethod': {
                    const method = variable as ClassMethod;
                    privateVariables.push({type: 'ClassMethod', name: method.name as string, parameters: method.parameters, environment: parentScope, minimumLength: method.minimumLength, infiniteName: method.infiniteName, body: method.body, isPrivate: true, isStatic: method.isStatic} as ClassMethodValue);
                    break;
                }
                case 'ClassVariable': {
                    const main = variable as ClassVariable;
                    const variableValue = main.value == undefined ? undefined : this.interpret(main.value, scopes);
                    privateVariables.push({type: 'ClassVariable', name: main.identifier, environment: parentScope, isPrivate: true, isReadonly: main.isReadonly, value: variableValue} as ClassVariableValue);
                    break;
                }
                default:
                    throw `Expected a class method or a class variable within the private variables of a class, instead got a ${variable.kind}.`;
            }
        });

        return scopes.current.declare(declarator.name, {value: {type: 'Class', environment: parentScope, name: declarator.name, publicVariables, privateVariables, initializer} as ClassValue, global: false}).value;
    }

    private evaluateNewExpr(expression: NewExpr, scopes: Scopes): RuntimeValue {
        const variable = scopes.current.lookup(expression.name).value;

        if (variable.type != 'Class') {
            throw `Expected the identifier of a new expression to be a class, instead got a ${variable.type}.`;
        }

        const classValue = variable as ClassValue;
        const currentSelf = new Map<string, RuntimeValue>();

        function createSelf(inPublic = false): ObjectValue {
            const self = inPublic == false ? currentSelf : new Map([...currentSelf]);

            classValue.publicVariables.forEach((value, _index) => {
                switch(value.type) {
                    case 'ClassMethod': {
                        const method = value as ClassMethodValue;
                        if (method.isStatic == false) {
                            method.createSelf = createSelf;
                        }
                        if (self.get(method.name) == undefined) {
                            self.set(method.name as string, method);
                        }
                        break;
                    }
                    case 'ClassVariable': {
                        const publicVariable = value as ClassVariableValue;
                        if (self.get(publicVariable.name) == undefined) {
                            self.set(publicVariable.name as string, publicVariable.value);
                        }
                        break;
                    }
                    default:
                        throw `Expected a class variable or a class method in the ${classValue.initializer} class's public variables, instead got a ${value.type}.`;
                }
            });

            classValue.privateVariables.forEach((value, _index) => {
                switch(value.type) {
                    case 'ClassMethod': {
                        const method = value as ClassMethodValue;
                        if (method.isStatic == false) {
                            method.createSelf = createSelf;
                        }
                        if (self.get(method.name) == undefined && inPublic == false) {
                            self.set(method.name as string, method);
                        } else if (self.get(method.name) != undefined && inPublic == true) {
                            self.delete(method.name as string);
                        }
                        break;
                    }
                    case 'ClassVariable': {
                        const publicVariable = value as ClassVariableValue;
                        if (currentSelf.get(publicVariable.name) == undefined) {
                            self.set(publicVariable.name as string, publicVariable.value);
                        } else if (currentSelf.get(publicVariable.name) != undefined && inPublic == true) {
                            self.delete(publicVariable.name);
                        }
                        break;
                    }
                    default:
                        throw `Expected a class variable or a class method in the ${classValue.initializer} class's private variables, instead got a ${value.type}.`;
                }
            });

            return {type: 'Object', properties: self} as ObjectValue;
        }

        if (classValue.initializer != undefined) {
            const initializer = classValue.initializer as ConstructorValue;
            const scope = new Environment(classValue.environment);
            const args = expression.parameters.map((argument) => this.interpret(argument, {"global": scopes.global, "current": scope}));
            
            if (initializer.minimumLength > args.length) {
                throw `The ${classValue.name} constructor requires at least ${initializer.minimumLength} parameters, but ${args.length} parameters were given.`;
            }

            let infProperties: Array<RuntimeValue> | undefined = undefined;

            for (let index = 0; index <= args.length; index++) {
                if (initializer.parameters[index] == '...') {
                    infProperties = new Array<RuntimeValue>();
                    continue;
                }

                if (infProperties == undefined) {
                    if (!args[index]) {
                        continue;
                    }

                    scope.declare(initializer.parameters[index], {value: args[index], global: false});
                    continue;
                }

                infProperties.push(args[index - 1]);
            }

            if (infProperties != undefined) {
                scope.declare(initializer.infiniteName as string, {value: {type: 'Array', properties: infProperties} as ArrayValue, global: false});
            }
            
            scope.declare("this", {value: createSelf(), constant: true, global: false});
            this.evaluateCode(initializer.body, {"global": scopes.global, "current": scope});
        }

        return createSelf(true);
    }

    private evaluateLogicalExpr(logical: LogicalExpr, scopes: Scopes): RuntimeValue {
        const left = this.interpret(logical.left, scopes);

        if (logical.comparator == "||") {
            if (this.isTrue(left)) {
                return left;
            }
        } else {
            if (!this.isTrue(left)) {
                return left
            }
        }

        return this.interpret(logical.right, scopes);
    }

    private evaluateAssignmentExpr(assignment: AssignmentExpr, scopes: Scopes): RuntimeValue {
        if (assignment.assignee.kind != 'Identifier' && assignment.assignee.kind != 'MemberExpr') {
            throw `Expected a identifier or a property access, instead got ${assignment.assignee}`;
        }

        if (assignment.assignee.kind == 'Identifier') {
            return scopes.current.assign((assignment.assignee as Identifier).symbol, this.interpret(assignment.value, scopes));
        }

        const memberNames: string[] = [];
        const evaluate = (memberNode: Stmt) => {
            switch(memberNode.kind) {
                case 'MemberExpr':
                    traverse(memberNode as MemberExpr);
                    break;
                case 'Identifier':
                    memberNames.push((memberNode as Identifier).symbol);
                    break;
                case 'StringLiteral':
                    memberNames.push((memberNode as StringLiteral).value);
                    break;
                default:
                    memberNames.push(this.stringify(this.interpret(memberNode, scopes)));
                    break;
            }
        }
        const traverse = (memberNode: MemberExpr) => {
            evaluate(memberNode.object);
            evaluate(memberNode.property);
        }
        
        traverse(assignment.assignee as MemberExpr);

        let variable: RuntimeValue | undefined = undefined;
        let objectTree: Map<string | number, RuntimeValue> = new Map();
        let returnValue: RuntimeValue = {type: 'None', value: null} as NoneValue;

        memberNames.forEach((value, index) => {
            if (index == 0) {
                variable = scopes.current.lookup(value).value;
                
                if (variable.type != 'Object' && variable.type != 'Array') {
                    throw `Expected a property access to be a array or object, instead got a ${variable.type}.`
                }

                objectTree = (variable as ObjectValue).properties;

                return;
            }

            if (variable == undefined) {
                throw 'Expected a variable to exist whilst parsing a assignment expression with a member expression.';
            }

            const objectValue = objectTree.get(value);

            if (objectValue == undefined) {
                if (index + 1 < memberNames.length) {
                    throw 'Property access does not exist.';
                }

                objectTree.set(value, this.interpret(assignment.value, scopes));
                return;
            }

            if (objectValue.type == 'Object' || objectValue.type == 'Array') {
                objectTree = (objectValue as ObjectValue).properties;
            } else {
                returnValue = this.interpret(assignment.value, scopes);
                objectTree.set(value, returnValue);
            }
        });

        return returnValue;
    }

    private evaluateForStatement(statement: ForStmt, scopes: Scopes): RuntimeValue {
        const scope = new Environment(scopes.current);
        let declared = false;
        let index = 0;

        this.interpret(statement.initializer, {"global": scopes.global, "current": scope});

        if (statement.initializer.kind == 'VariableDeclaration') {
            declared = true;
        }

        let result: RuntimeValue | null = null;

        while (this.isTrue(this.interpret(statement.condition, {"global": scopes.global, "current": scope}))) {
            result = this.evaluateCode(statement.body, {"global": scopes.global, "current": scope});

            this.interpret(statement.incrementor, {"global": scopes.global, "current": scope});

            if (declared == true) {
                const variable = scope.tryLookup((statement.initializer as VariableDeclaration).identifier);

                if (variable == undefined) {
                    throw `The declared index variable ${(statement.initializer as VariableDeclaration).identifier} has disappeared, and cannot be accessed.`;
                }

                if (variable.value.type == "Number") {
                    index++;
                    variable.value = {type: 'Number', value: index} as NumberValue;
                }
            }
        }

        return result == null ? {type: 'None', value: null} as NoneValue : result;
    }

    private evaluateWhileStmt(statement: WhileStmt, scopes: Scopes): RuntimeValue {
        const scope = new Environment(scopes.current);
        let declared = false;
        let index = 0;
        
        if (statement.variable) {
            if (statement.variable.value) {
                declared = true;
                index = (statement.variable.value as NumericLiteral).value;
                scope.declare(statement.variable.identifier, {
                    global: false,
                    value: this.interpret(statement.variable.value as NumericLiteral, {"global": scopes.global, "current": scope})
                });
            } else {
                throw 'Expected a while statement to have a index variable with a value.';
            }
        }

        let result: RuntimeValue | null = null;
        let whileScope = new Environment(scope);

        while (this.isTrue(this.interpret(statement.condition, {"global": scopes.global, "current": whileScope}))) {
            result = this.evaluateCode(statement.body, {"global": scopes.global, "current": whileScope});
            whileScope = new Environment(scope);
            index++;

            if (declared == true) {
                const variable = scope.tryLookup((statement.variable as VariableDeclaration).identifier);

                if (variable == undefined) {
                    throw `The declared index variable ${(statement.variable as VariableDeclaration).identifier} has disappeared, and cannot be accessed.`;
                }

                variable.value = {type: 'Number', value: index} as NumberValue;
            }
        }

        return result == null ? {type: 'None', value: null} as NoneValue : result;
    }

    private evaluateIfStmt(statement: IfStmt, scopes: Scopes): RuntimeValue | null {
        if (this.isTrue(this.interpret(statement.condition, scopes))) {
            if (statement.thenBranch.kind == 'BlockStmt') {
                const result = this.evaluateCode((statement.thenBranch as BlockStmt).body, {"global": scopes.global, "current": new Environment(scopes.current)});
                return result == null ? {type: 'None', value: null} as NoneValue : result;
            } else {
                return this.evaluateBlock({kind: 'BlockStmt', body: [statement.thenBranch]} as BlockStmt, scopes);
            }
        } else if (statement.elseBranch != undefined) {
            if (statement.elseBranch.kind == 'BlockStmt') {
                return this.evaluateBlock(statement.elseBranch as BlockStmt, scopes);
            } else {
                return this.evaluateIfStmt((statement.elseBranch as IfStmt), scopes);
            }
        }

        return null;
    }

    private evaluateUnaryExpr(operation: UnaryExpr, scopes: Scopes): RuntimeValue {
        const right = this.interpret(operation.right, scopes);

        switch(operation.operator) {
            case '-':
                if (right.type != 'Number') {
                    throw 'The right side of a negative unary expression must be a number.';
                }

                return {type: 'Number', value: -(right as NumberValue).value} as NumberValue;
            case '!':
                return {type: 'Boolean', value: !this.isTrue(right)} as BooleanValue;
            default:
                return {type: 'None', value: null} as NoneValue;
        }
    }

    private evaluateFunctionDeclaration(declarator: FunctionDeclaration, scopes: Scopes): RuntimeValue {
        if (declarator.name) {
            return scopes.current.declare(
                declarator.name,
                {value: {type: 'Function', name: declarator.name, parameters: declarator.parameters, environment: scopes.current, body: declarator.body, minimumLength: declarator.minimumLength, infiniteName: declarator.infiniteName} as FunctionValue, global: false}
            ).value;
        } else {
            return {type: 'Method', parameters: declarator.parameters, body: declarator.body, minimumLength: declarator.minimumLength, infiniteName: declarator.infiniteName, environment: scopes.current} as MethodValue;
        }
    }

    private evaluateCallExpr(call: CallExpr, scopes: Scopes): RuntimeValue {
        const args = call.arguments.map((argument) => this.interpret(argument, scopes));
        const tryMethod = this.interpret(call.caller, scopes);

        switch(tryMethod.type) {
            case 'NativeMethod':
                return (tryMethod as NativeMethodValue).call(args, scopes);
            case 'Function': {
                const method = tryMethod as FunctionValue;
                const scope = new Environment(method.environment);

                if (method.minimumLength > args.length) {
                    throw `The ${method.name} function requires at least ${method.minimumLength} parameters, but ${args.length} parameters were given.`;
                }

                let infProperties: Array<RuntimeValue> | undefined = undefined;

                for (let index = 0; index <= args.length; index++) {
                    if (method.parameters[index] == '...') {
                        infProperties = new Array<RuntimeValue>();
                        continue;
                    }

                    if (infProperties == undefined) {
                        if (!args[index]) {
                            continue;
                        }

                        scope.declare(method.parameters[index], {value: args[index], global: false});
                        continue;
                    }

                    infProperties.push(args[index - 1]);
                }

                if (infProperties != undefined) {
                    scope.declare(method.infiniteName as string, {value: {type: 'Array', properties: infProperties} as ArrayValue, global: false});
                }

                const result: RuntimeValue | null = this.evaluateCode(method.body, {"global": scopes.global, "current": scope});
                return result == null ? {type: 'None', value: null} as NoneValue : result;
            }
            case 'Method': {
                const method = tryMethod as MethodValue;
                const scope = new Environment(method.environment);

                if (method.minimumLength > args.length) {
                    throw `The given method requires at least ${method.minimumLength} parameters, but ${args.length} parameters were given.`;
                }

                let infProperties: Array<RuntimeValue> | undefined = undefined;

                for (let index = 0; index <= args.length; index++) {
                    if (method.parameters[index] == '...') {
                        infProperties = new Array<RuntimeValue>();
                        continue;
                    }

                    if (infProperties == undefined) {
                        if (!args[index]) {
                            continue;
                        }

                        scope.declare(method.parameters[index], {value: args[index], global: false});
                        continue;
                    }

                    infProperties.push(args[index - 1]);
                }

                if (infProperties != undefined) {
                    scope.declare(method.infiniteName as string, {value: {type: 'Array', properties: infProperties} as ArrayValue, global: false});
                }

                const result: RuntimeValue | null = this.evaluateCode(method.body, {"global": scopes.global, "current": scope});
                return result == null ? {type: 'None', value: null} as NoneValue : result;
            }
            case 'ClassMethod': {
                const method = tryMethod as ClassMethodValue;
                const scope = new Environment(method.environment);
                
                if (method.isStatic == false) {
                    if (method.createSelf == undefined) {
                        throw 'Cannot call a class method in which is uninitialized.';
                    }
                    scope.declare("this", {value: method.createSelf?.(), constant: true, global: false});
                }

                if (method.minimumLength > args.length) {
                    throw `The given method requires at least ${method.minimumLength} parameters, but ${args.length} parameters were given.`;
                }
    
                let infProperties: Array<RuntimeValue> | undefined = undefined;
    
                for (let index = 0; index <= args.length; index++) {
                    if (method.parameters[index] == '...') {
                        infProperties = new Array<RuntimeValue>();
                        continue;
                    }
    
                    if (infProperties == undefined) {
                        if (!args[index]) {
                            continue;
                        }
    
                        scope.declare(method.parameters[index], {value: args[index], global: false});
                        continue;
                    }
    
                    infProperties.push(args[index - 1]);
                }
    
                if (infProperties != undefined) {
                    scope.declare(method.infiniteName as string, {value: {type: 'Array', properties: infProperties} as ArrayValue, global: false});
                }
    
                const result: RuntimeValue | null = this.evaluateCode(method.body, {"global": scopes.global, "current": scope});
                return result == null ? {type: 'None', value: null} as NoneValue : result;
            }
            default:
                throw `Function ${this.stringify(tryMethod)} does not exist.`;
        }
    }

    private evaluateProgram(program: Program, scopes: Scopes): RuntimeValue {
        let lastEvaluated: RuntimeValue = {type: 'None', value: null} as NoneValue as NoneValue;

        for (const node of program.body) {
            lastEvaluated = this.interpret(node, scopes);
        }

        return lastEvaluated;
    }

    private evaluateBinaryExpr(operation: BinaryExpr, scopes: Scopes): RuntimeValue {
        let left = this.interpret(operation.left, scopes);
        let right = this.interpret(operation.right, scopes);

        switch(operation.operator) {
            case '+': {
                if (left.type == 'Number' && right.type == 'Number') {
                    return {type: 'Number', value: (left as NumberValue).value + (right as NumberValue).value} as NumberValue;
                } else {
                    let leftString = '';
                    let rightString = '';

                    switch(left.type) {
                        case 'Number':
                            leftString = (left as NumberValue).value.toString();
                            break;
                        case 'String':
                            leftString = (left as StringValue).value;
                            break;
                        case 'Object': case 'Array':
                            leftString = this.stringify(left);
                            break;
                        default:
                            throw `Expected the left side of a non-numeric addition equation to be a number, string, object, or array, instead got a ${left.type}.`
                    }

                    switch(right.type) {
                        case 'Number':
                            rightString = (right as NumberValue).value.toString();
                            break;
                        case 'String':
                            rightString = (right as StringValue).value;
                            break;
                        case 'Object': case 'Array':
                            rightString = this.stringify(right);
                            break;
                        default:
                            throw `Expected the right side of a non-numeric addition equation to be a number, string, object, or array, instead got a ${right.type}.`
                    }

                    return {type: 'String', value: leftString + rightString} as StringValue;
                }
            }
            case '-': 
                if (left.type != 'Number' || right.type != 'Number') {
                    throw `Expected the left and right sides of a subtraction operation to be numbers, instead got a ${left.type} and a ${right.type}.`;
                }

                return {type: 'Number', value: (left as NumberValue).value - (right as NumberValue).value} as NumberValue;
            case '*':
                if (left.type != 'Number' || right.type != 'Number') {
                    throw `Expected the left and right sides of a multiplication operation to be numbers, instead got a ${left.type} and a ${right.type}.`;
                }

                return {type: 'Number', value: (left as NumberValue).value * (right as NumberValue).value} as NumberValue;
            case '/':
                if (left.type != 'Number' || right.type != 'Number') {
                    throw `Expected the left and right sides of a division operation to be numbers, instead got a ${left.type} and a ${right.type}.`;
                }

                if ((left as NumberValue).value == 0 || (right as NumberValue).value == 0) {
                    throw 'Cannot divide by 0.';
                }
                
                return {type: 'Number', value: (left as NumberValue).value / (right as NumberValue).value} as NumberValue;
            case '%':
                if (left.type != 'Number' || right.type != 'Number') {
                    throw `Expected the left and right sides of a modulus operation to be numbers, instead got a ${left.type} and a ${right.type}.`;
                }

                return {type: 'Number', value: (left as NumberValue).value % (right as NumberValue).value} as NumberValue;
            case '**':
                if (left.type != 'Number' || right.type != 'Number') {
                    throw `Expected the left and right sides of a power operation to be numbers, instead got a ${left.type} and a ${right.type}.`;
                }

                return {type: 'Number', value: (left as NumberValue).value ** (right as NumberValue).value} as NumberValue;
            case ">":
                try {
                    left = {type: 'Number', value: this.numberify(left)} as NumberValue;
                    right = {type: 'Number', value: this.numberify(right)} as NumberValue;
                } catch {
                    throw `Expected the left and right sides of a greater-than operation to be numbers, instead got a ${left.type} and a ${right.type}.`;
                }

                return {type: 'Boolean', value: (left as NumberValue).value > (right as NumberValue).value} as BooleanValue;
            case ">=":
                try {
                    left = {type: 'Number', value: this.numberify(left)} as NumberValue;
                    right = {type: 'Number', value: this.numberify(right)} as NumberValue;
                } catch {
                    throw `Expected the left and right sides of a greater-than or equals operation to be numbers, instead got a ${left.type} and a ${right.type}.`;
                }

                return {type: 'Boolean', value: (left as NumberValue).value >= (right as NumberValue).value} as BooleanValue;
            case "<":
                try {
                    left = {type: 'Number', value: this.numberify(left)} as NumberValue;
                    right = {type: 'Number', value: this.numberify(right)} as NumberValue;
                } catch {
                    throw `Expected the left and right sides of a greater-than operation to be numbers, instead got a ${left.type} and a ${right.type}.`;
                }

                return {type: 'Boolean', value: (left as NumberValue).value < (right as NumberValue).value} as BooleanValue;
            case "<=":
                try {
                    left = {type: 'Number', value: this.numberify(left)} as NumberValue;
                    right = {type: 'Number', value: this.numberify(right)} as NumberValue;
                } catch {
                    throw `Expected the left and right sides of a less-than or equals operation to be numbers, instead got a ${left.type} and a ${right.type}.`;
                }

                return {type: 'Boolean', value: (left as NumberValue).value <= (right as NumberValue).value} as BooleanValue;
            case '!=': {
                if ('value' in left && 'value' in right) {
                    return {type: 'Boolean', value: left.value != right.value} as BooleanValue;
                } else {
                    throw `Expected the left and right sides of a non-equality operation to have a value.`;
                }
            }
            case '==': {
                if ('value' in left && 'value' in right) {
                    return {type: 'Boolean', value: left.value == right.value} as BooleanValue;
                } else {
                    throw `Expected the left and right sides of a equality operation to have a value.`;
                }
            }
            default:
                throw `Operator ${operation.operator} is not a valid operator.`;
        }
    }
}