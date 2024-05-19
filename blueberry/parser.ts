import { 
    Stmt,
    Program,
    Expr,
    BinaryExpr,
    NumericLiteral,
    MemberExpr,
    VariableDeclaration,
    NoneLiteral,
    BooleanLiteral,
    Identifier,
    AssignmentExpr,
    ObjectExpr,
    ObjectPropertyExpr,
    ArrayPropertyExpr,
    ArrayExpr,
    StringLiteral,
    PrintStmt,
    CallExpr,
    FunctionDeclaration,
    ReturnStmt,
    LogicalExpr,
    UnaryExpr,
    BlockStmt,
    IfStmt,
    DoExpr,
    WhileStmt,
    ForStmt,
    InfiniteExpr,
    ClassDeclaration,
    ClassMethod,
    ClassVariable,
    NewExpr
} from './ast.ts';

import {
    Token,
    TokenType
} from './lexer.ts';

export class Parser {
    private tokens: Array<Token> = [];
    public result: Program;

    public constructor(tokens: Array<Token>) {
        this.tokens = tokens;
        
        const program = {kind: 'Program', body: []} as Program;

        while ((this.tokens[0] as Token).type != TokenType.EOF) {
            program.body.push(this.parseStmt());
        }

        this.result = program;
    }

    private parseStmt(): Stmt {
        switch(this.tokens[0].type) {
            case TokenType.Global:
            case TokenType.Local:
            case TokenType.Var:
                return this.parseVariableDeclaration();
            case TokenType.Print:
                return this.parsePrintStatement();
            case TokenType.Function:
                return this.parseFunctionDeclaration();
            case TokenType.Return:
                return this.parseReturnStatement();
            case TokenType.If:
                return this.parseIfStatement();
            case TokenType.While:
                return this.parseWhileStatement();
            case TokenType.For:
                return this.parseForStatement();
            case TokenType.Class:
                return this.parseClassDeclaration();
            default:
                return this.parseExpr();
        }
    }
    
    private parseBlockStatement(): Stmt {
        if ((this.tokens[0] as Token).type != TokenType.OpenBrace) {
            throw `Expected a open brace to begin a code block, instead got a ${(this.tokens[0] as Token).type}.`;
        }

        this.tokens.shift();

        const body: Array<Stmt> = [];

        while ((this.tokens[0] as Token).type != TokenType.EOF && (this.tokens[0] as Token).type != TokenType.CloseBrace) {
            body.push(this.parseStmt());
        }

        if ((this.tokens[0] as Token).type != TokenType.CloseBrace) {
            throw `Expected a closing brace following a code block, instead got a ${(this.tokens[0] as Token).type}.`;
        }

        this.tokens.shift();
        return {kind: 'BlockStmt', body} as BlockStmt;
    }

    private parseClassDeclaration(): Stmt {
        this.tokens.shift();
        if ((this.tokens[0] as Token).type != TokenType.Identifier) {
            throw `Expected a identifier following a class declaration, instead got a ${(this.tokens[0] as Token).type}.`;
        }

        const name = (this.tokens.shift() as Token).value;
        const publicVariables = new Array<Stmt>();
        const privateVariables = new Array<Stmt>();
        let initializer: Stmt | undefined = undefined;

        if ((this.tokens[0] as Token).type != TokenType.OpenBrace) {
            throw `Expected a open brace following a class declaration, instead got a ${(this.tokens[0] as Token).type}.`
        }

        this.tokens.shift();

        while ((this.tokens[0] as Token).type != TokenType.EOF && (this.tokens[0] as Token).type != TokenType.CloseBrace) {
            let isPrivate = false;
            let isReadonly = false;
            let isStatic = false;
            let statement: Stmt;

            while ((this.tokens[0] as Token).type == TokenType.Readonly || (this.tokens[0] as Token).type == TokenType.Private || (this.tokens[0] as Token).type == TokenType.Public || (this.tokens[0] as Token).type == TokenType.Static) {
                switch((this.tokens[0] as Token).type) {
                    case TokenType.Private:
                        isPrivate = true;
                        this.tokens.shift();
                        break;
                    case TokenType.Public:
                        this.tokens.shift();
                        break;
                    case TokenType.Readonly:
                        this.tokens.shift();
                        isReadonly = true;
                        break;
                    case TokenType.Static:
                        this.tokens.shift();
                        isStatic = true;
                        break;
                    default:
                        throw `Expected either the "public", "private", "readonly", or "static" keyword within a class body, instead got a ${(this.tokens[0] as Token).type}.`;
                }
            }
            if ((this.tokens[0] as Token).type != TokenType.Identifier && (this.tokens[0] as Token).type != TokenType.Constructor) {
                throw `Expected a name or the "constructor" keyword following the "public", "private", or "readonly" keyword within a class body, instead got a ${(this.tokens[0] as Token).type}.`;
            }

            if ((this.tokens[0] as Token).type == TokenType.Constructor) {
                if (initializer != undefined) {
                    throw 'Only one constructor can be provided within a class body.';
                }

                if (isPrivate == true) {
                    throw 'Constructors of a class cannot be private.';
                }

                this.tokens.shift();

                let infiniteName: string | undefined = undefined;
                let minimum = 0;
                const parameters: Array<string> = this.parseArguments().map((value) => {
                    if (value.kind != 'Identifier' && value.kind != 'InfiniteExpr') {
                        throw `Expected a function parameter name to be an identifier or an infinite expression, instead got a ${value.kind}.`;
                    }
        
                    if (value.kind == 'Identifier') {
                        minimum += 1;
                        return (value as Identifier).symbol;
                    }
        
                    infiniteName = (value as InfiniteExpr).name;
                    return '...';
                });

                statement = {kind: 'ClassMethod', isStatic: false, isPrivate, minimumLength: minimum, parameters, infiniteName, name: null, body: (this.parseBlockStatement() as BlockStmt).body} as ClassMethod;
                initializer = statement;

                continue;
            }

            const identifier = (this.tokens.shift() as Token).value;
            
            switch ((this.tokens[0] as Token).type) {
                case TokenType.Equals:
                    throw 'Variables declared in a class can only have their value determined in the constructor.';
                case TokenType.OpenParen: {
                    let infiniteName: string | undefined = undefined;
                    let minimum = 0;
                    const parameters: Array<string> = this.parseArguments().map((value) => {
                        if (value.kind != 'Identifier' && value.kind != 'InfiniteExpr') {
                            throw `Expected a function parameter name to be an identifier or an infinite expression, instead got a ${value.kind}.`;
                        }
            
                        if (value.kind == 'Identifier') {
                            minimum += 1;
                            return (value as Identifier).symbol;
                        }
            
                        infiniteName = (value as InfiniteExpr).name;
                        return '...';
                    });

                    statement = {kind: 'ClassMethod', isStatic, isPrivate, minimumLength: minimum, parameters, infiniteName, name: identifier, body: (this.parseBlockStatement() as BlockStmt).body} as ClassMethod;
                    if (isPrivate) {
                        privateVariables.push(statement);
                        break;
                    }

                    publicVariables.push(statement);
                    break;
                }
                default: {
                    if (isReadonly) {
                        throw 'Readonly variables must have a value assigned to them.';
                    }

                    statement = {kind: 'ClassVariable', isPrivate, isReadonly: false, identifier} as ClassVariable;

                    if ((this.tokens[0] as Token).type == TokenType.SemiColon) {
                        this.tokens.shift();
                    }

                    if (isPrivate) {
                        privateVariables.push(statement);
                        break;
                    }

                    publicVariables.push(statement);
                    break;
                }
            }
        }

        if ((this.tokens[0] as Token).type != TokenType.CloseBrace) {
            throw `Expected a closing brace following a class body, instead got a ${(this.tokens[0] as Token).type}.`
        }

        this.tokens.shift();

        return {kind: 'ClassDeclaration', name, initializer, publicVariables, privateVariables} as ClassDeclaration;
    }

    private parseForStatement(): Stmt {
        this.tokens.shift();

        if ((this.tokens[0] as Token).type != TokenType.OpenParen) {
            throw `Expected an open parenthesis following a for statement, instead got a ${(this.tokens[0] as Token).type}.`;
        }

        this.tokens.shift();

        if ((this.tokens[0] as Token).type == TokenType.SemiColon) {
            throw `Expected a initializer within a for loop, instead got a ${(this.tokens[0] as Token).type}.`;
        }

        const initializer = this.parseStmt();

        if (initializer.kind == "VariableDeclaration" && (initializer as VariableDeclaration).value == undefined) {
            (initializer as VariableDeclaration).value = {kind: 'NumericLiteral', value: 0} as NumericLiteral;
        }

        // TODO: Handle "in" and "of".

        if ((this.tokens[0] as Token).type == TokenType.SemiColon) {
            throw `Expected a condition within a for loop, instead got a ${(this.tokens[0] as Token).type}.`;
        }

        const condition = this.parseExpr();
        if ((this.tokens[0] as Token).type == TokenType.SemiColon) {this.tokens.shift()};

        if ((this.tokens[0] as Token).type == TokenType.SemiColon) {
            throw `Expected a incrementor within a for loop, instead got a ${(this.tokens[0] as Token).type}.`;
        }

        const incrementor = this.parseExpr();

        if ((this.tokens[0] as Token).type == TokenType.SemiColon) {this.tokens.shift()};

        if ((this.tokens[0] as Token).type != TokenType.CloseParen) {
            throw `Expected a closing parenthesis following a for statement, instead got a ${(this.tokens[0] as Token).type}.`
        }

        this.tokens.shift();

        return {kind: 'ForStmt', initializer, condition, incrementor, body: (this.parseBlockStatement() as BlockStmt).body} as ForStmt;
    }

    private parseWhileStatement(): Stmt {
        this.tokens.shift();

        if ((this.tokens[0] as Token).type != TokenType.OpenParen) {
            throw `Expected a open parenthesis following a while statement, instead got a ${(this.tokens[0] as Token).type}.`;
        }

        this.tokens.shift();

        const condition = this.parseExpr();
        let variable: VariableDeclaration | undefined;

        if ((this.tokens[0] as Token).type == TokenType.SemiColon) {
            this.tokens.shift();

            if ((this.tokens[0] as Token).type != TokenType.Local && (this.tokens[0] as Token).type != TokenType.Var) {
                throw `Expected a local variable declaration to follow a semicolon within a while condition, instead got a ${(this.tokens[0] as Token).type}.`;
            }

            variable = this.parseVariableDeclaration() as VariableDeclaration;

            if (variable.value != undefined) {
                if (variable.value.kind != 'NumericLiteral') {
                    throw `Expected a index variable within a while condition that has a value to be a number, instead got a ${variable.value.kind}.`;
                }
            } else {
                variable.value = {kind: 'NumericLiteral', value: 0} as NumericLiteral;
            }
        }

        if ((this.tokens[0] as Token).type != TokenType.CloseParen) {
            throw `Expected a closing parenthesis after a while condition, instead got a ${(this.tokens[0] as Token).type}.`;
        }

        this.tokens.shift();

        return {kind: 'WhileStmt', body: (this.parseBlockStatement() as BlockStmt).body, condition, variable} as WhileStmt;
    }

    private parseIfStatement(): Stmt {
        this.tokens.shift();

        if ((this.tokens[0] as Token).type != TokenType.OpenParen) {
            throw `Expected a open parenthesis following an if statement, instead got a ${(this.tokens[0] as Token).type}.`;
        }

        this.tokens.shift();

        const condition = this.parseExpr();

        if ((this.tokens[0] as Token).type != TokenType.CloseParen) {
            throw `Expected a closing parenthesis following an if statement condition, instead got a ${(this.tokens[0] as Token).type}.`;
        }

        this.tokens.shift();

        const thenBranch = this.parseBlockStatement();

        let elseBranch: Stmt | undefined = undefined;
        if ((this.tokens[0] as Token).type == TokenType.Else) {
            this.tokens.shift();
            
            if ((this.tokens[0] as Token).type == TokenType.OpenBrace) {
                elseBranch = this.parseBlockStatement();
            } else {
                elseBranch = this.parseStmt();
            }
        }

        return {kind: 'IfStmt', condition, thenBranch, elseBranch} as IfStmt;
    }

    private parseReturnStatement(): Stmt {
        this.tokens.shift();

        const value = this.parseStmt();

        if ((this.tokens[0] as Token).type == TokenType.SemiColon) {
            this.tokens.shift();
        }

        return {kind: 'ReturnStmt', value} as ReturnStmt;
    }

    private parseFunctionDeclaration(): Stmt {
        this.tokens.shift();

        let name: string | undefined = undefined;
        let minimum = 0;
        let infiniteName: string | undefined = undefined;

        if ((this.tokens[0] as Token).type == TokenType.Identifier) {
            name = (this.tokens.shift() as Token).value;
        }

        const parameters: Array<string> = this.parseArguments().map((value) => {
            if (value.kind != 'Identifier' && value.kind != 'InfiniteExpr') {
                throw `Expected a function parameter name to be an identifier or an infinite expression, instead got a ${value.kind}.`;
            }

            if (value.kind == 'Identifier') {
                minimum += 1;
                return (value as Identifier).symbol;
            }

            infiniteName = (value as InfiniteExpr).name;
            return '...';
        });

        return {kind: 'FunctionDeclaration', body: (this.parseBlockStatement() as BlockStmt).body, minimumLength: minimum, infiniteName, name, parameters} as FunctionDeclaration;
    }

    private parsePrintStatement(): Stmt {
        this.tokens.shift();

        const output = this.parseArgumentList();

        if ((this.tokens[0] as Token).type == TokenType.SemiColon) {
            this.tokens.shift();
        }

        return {kind: 'PrintStmt', output} as PrintStmt;
    }

    private parseVariableDeclaration(): Stmt {
        const variable = {
            kind: 'VariableDeclaration',
            identifier: '',
            global: false
        } as VariableDeclaration;
        
        switch(this.tokens[0].type) {
            case TokenType.Global:
                this.tokens.shift();
                variable.global = true;
                break;
            case TokenType.Var: {
                this.tokens.shift();

                if ((this.tokens[0] as Token).type == TokenType.Colon) {
                    this.tokens.shift();

                    if ((this.tokens[0] as Token).type != TokenType.Identifier) {
                        throw 'Expected a scope after a scope-variable declaration.'
                    } 

                    variable.scope = (this.tokens.shift() as Token).value;
                }

                break;
            }
            default:
                this.tokens.shift();
                break;
        }

        if ((this.tokens[0] as Token).type != TokenType.Identifier) {
            throw 'A variable must have a name assigned to it.';
        }

        variable.identifier = (this.tokens.shift() as Token).value;

        if ((this.tokens[0] as Token).type == TokenType.Equals) {
            this.tokens.shift();
            variable.value = this.parseStmt();
        }

        if ((this.tokens[0] as Token).type == TokenType.SemiColon) {
            this.tokens.shift();
        }

        return variable;
    }

    private parseExpr(): Expr {
        return this.parseNewExpr();
    }

    private parseNewExpr(): Stmt {
        if ((this.tokens[0] as Token).type != TokenType.New) {
            return this.parseDoExpr();
        }

        this.tokens.shift();

        if ((this.tokens[0] as Token).type != TokenType.Identifier) {
            throw `Expected a class name following a new statement, instead got a ${(this.tokens[0] as Token).type}.`;
        }

        const name = (this.tokens.shift() as Token).value;

        if ((this.tokens[0] as Token).type != TokenType.OpenParen) {
            throw `Expected a open parenthesis following a new statement, instead got a ${(this.tokens[0] as Token).type}.`;
        }

        this.tokens.shift();
        const parameters = ((this.tokens[0] as Token).type == TokenType.CloseParen) ? [] : this.parseArgumentList();

        if ((this.tokens[0] as Token).type != TokenType.CloseParen) {
            throw `Expected a closing parenthesis following a new statement, instead got a ${(this.tokens[0] as Token).type}.`;
        }

        this.tokens.shift();

        if ((this.tokens[0] as Token).type == TokenType.SemiColon) {
            this.tokens.shift();
        }
        return {kind: 'NewExpr', name, parameters} as NewExpr;
    }

    private parseDoExpr(): Stmt {
        if ((this.tokens[0] as Token).type != TokenType.Do) {
            return this.parseAssignmentExpr();
        }

        this.tokens.shift();

        return {kind: 'DoExpr', body: this.parseBlockStatement() as BlockStmt} as DoExpr;
    }

    private parseAssignmentExpr(): Expr {
        const left = this.parseOrExpr();

        if ((this.tokens[0] as Token).type == TokenType.Equals) {
            this.tokens.shift();

            const value = this.parseAssignmentExpr();

            if ((this.tokens[0] as Token).type == TokenType.SemiColon) {
                this.tokens.shift();
            }

            return {kind: 'AssignmentExpr', value, assignee: left} as AssignmentExpr;
        }

        return left;
    }

    private parseOrExpr(): Expr {
        let left = this.parseAndExpr();

        while ((this.tokens[0] as Token).type == TokenType.Or) {
            left = {kind: 'LogicalExpr', left, comparator: (this.tokens.shift() as Token).value, right: this.parseAndExpr()} as LogicalExpr;
        }

        return left;
    }

    private parseAndExpr(): Expr {
        let left = this.parseEqualityExpr();

        while ((this.tokens[0] as Token).type == TokenType.And) {
            left = {kind: 'LogicalExpr', left, comparator: (this.tokens.shift() as Token).value, right: this.parseEqualityExpr()} as LogicalExpr;
        }

        return left;
    }

    private parseEqualityExpr(): Expr {
        let left = this.parseComparisonExpr();

        while ((this.tokens[0] as Token).type == TokenType.DoubleEquals || (this.tokens[0] as Token).type == TokenType.NotEquals) {
            left = {kind: 'BinaryExpr', left, operator: (this.tokens.shift() as Token).value, right: this.parseComparisonExpr()} as BinaryExpr;
        }

        return left;
    }

    private parseComparisonExpr(): Expr {
        let left = this.parseObjectExpr();

        while ((this.tokens[0] as Token).type == TokenType.GreaterEquals || (this.tokens[0] as Token).type == TokenType.Greater || (this.tokens[0] as Token).type == TokenType.Less || (this.tokens[0] as Token).type == TokenType.LessEquals) {
            left = {kind: 'BinaryExpr', left, operator: (this.tokens.shift() as Token).value, right: this.parseObjectExpr()} as BinaryExpr;
        }

        return left;
    }

    private parseObjectExpr(): Expr {
        if ((this.tokens[0] as Token).type != TokenType.OpenBrace) {
            return this.parseArrayExpr();
        }

        this.tokens.shift();

        const properties = new Array<ObjectPropertyExpr>;

        while ((this.tokens[0] as Token).type != TokenType.EOF && (this.tokens[0] as Token).type != TokenType.CloseBrace) {
            const key = (this.tokens.shift() as Token).value;

            switch((this.tokens[0] as Token).type) {
                case TokenType.Comma: {
                    this.tokens.shift();
                    properties.push({kind: 'ObjectPropertyExpr', key} as ObjectPropertyExpr);
                    break;
                }
                case TokenType.CloseBrace: {
                    properties.push({kind: 'ObjectPropertyExpr', key} as ObjectPropertyExpr);
                    break;
                }
                case TokenType.Colon: {
                    this.tokens.shift();
                    properties.push({kind: 'ObjectPropertyExpr', value: this.parseStmt(), key} as ObjectPropertyExpr);

                    if ((this.tokens[0] as Token).type != TokenType.CloseBrace) {
                        if ((this.tokens[0] as Token).type != TokenType.Comma) {
                            throw `Expected a comma or a closing brace after an object property, instead got a ${(this.tokens[0] as Token).type}.`
                        }

                        this.tokens.shift();
                    }

                    break;
                }
                default:
                    throw `Expected a comma, closing brace, or a colon after an object key, instead got a ${(this.tokens[0] as Token).type}.`;
            }
        }

        if ((this.tokens[0] as Token).type != TokenType.CloseBrace) {
            throw 'A closing brace must be present in an object.'
        }

        this.tokens.shift();

        return { kind: 'ObjectExpr', properties } as ObjectExpr;
    }

    private parseArrayExpr(): Expr {
        if ((this.tokens[0] as Token).type != TokenType.OpenBracket) {
            return this.parseTermExpr();
        }

        this.tokens.shift();

        const properties = new Array<ArrayPropertyExpr>;
        let index = 0;

        while ((this.tokens[0] as Token).type != TokenType.EOF && (this.tokens[0] as Token).type != TokenType.CloseBracket) {
            const value = this.parseExpr();

            switch((this.tokens[0] as Token).type) {
                case TokenType.Comma: {
                    this.tokens.shift();
                    properties.push({kind: 'ArrayPropertyExpr', index, value} as ArrayPropertyExpr);
                    break;
                }
                case TokenType.CloseBracket: {
                    properties.push({kind: 'ArrayPropertyExpr', index, value} as ArrayPropertyExpr);
                    break;
                }
                default: {
                    throw `Expected a comma or a closing bracket after an array value, instead got a ${(this.tokens[0] as Token).type}.`;
                }
            }

            index++;
        }

        if ((this.tokens[0] as Token).type != TokenType.CloseBracket) {
            throw 'A closing bracket must be present in an array.'
        }

        this.tokens.shift();

        return { kind: 'ArrayExpr', properties } as ArrayExpr;
    }
    
    private parseTermExpr(): Expr {
        let left = this.parseFactorExpr();

        while ((this.tokens[0] as Token).type == TokenType.Plus || (this.tokens[0] as Token).type == TokenType.Minus) {
            left = {kind: 'BinaryExpr', left, operator: (this.tokens.shift() as Token).value, right: this.parseFactorExpr()} as BinaryExpr;
        }

        return left;
    }

    private parseFactorExpr(): Expr {
        let left = this.parsePowerExpr();

        while ((this.tokens[0] as Token).type == TokenType.Slash || (this.tokens[0] as Token).type == TokenType.Star || (this.tokens[0] as Token).type == TokenType.Percent) {
            left = {kind: 'BinaryExpr', left, operator: (this.tokens.shift() as Token).value, right: this.parsePowerExpr()} as BinaryExpr;
        }

        return left;
    }

    private parsePowerExpr(): Expr {
        let left = this.parseUnaryExpr();

        while ((this.tokens[0] as Token).type == TokenType.DoubleStar) {
            left = {kind: 'BinaryExpr', left, operator: (this.tokens.shift() as Token).value, right: this.parsePowerExpr()} as BinaryExpr;
        }

        return left;
    }

    private parseUnaryExpr(): Expr {
        if ((this.tokens[0] as Token).type == TokenType.Not || (this.tokens[0] as Token).type == TokenType.Minus) {
            return {kind: 'UnaryExpr', operator: (this.tokens.shift() as Token).value, right: this.parseUnaryExpr()} as UnaryExpr;
        }

        return this.parseCallMemberExpr();
    }

    private parseCallMemberExpr(): Expr {
        const member = this.parseMemberExpr();

        if ((this.tokens[0] as Token).type == TokenType.OpenParen) {
            return this.parseCallExpr(member);
        }

        return member;
    }

    private parseMemberExpr(): Expr {
        let object = this.parsePrimaryExpr();

        while ((this.tokens[0] as Token).type == TokenType.Dot || (this.tokens[0] as Token).type == TokenType.OpenBracket) {
            const operator = this.tokens.shift() as Token;
            let property: Expr;
            let computed = false;

            switch(operator.type) {
                case TokenType.Dot: {
                    property = this.parsePrimaryExpr();

                    if (property.kind != "Identifier") {
                        throw `Expected the member name following a noncomputed member to be an identifier, instead got a ${property.kind}.`;
                    }

                    break;
                }
                case TokenType.OpenBracket: {
                    computed = true;
                    property = this.parseExpr();

                    if ((this.tokens[0] as Token).type != TokenType.CloseBracket) {
                        throw `Expected a closing bracket following a computed member, instead got a ${(this.tokens[0] as Token)}.`;
                    }

                    this.tokens.shift();
                    break;
                }
                default:
                    throw `Expected a open bracket or a period following a member, instead got a ${operator.type}.`;
            }

            object = {kind: 'MemberExpr', object, property, computed} as MemberExpr;
        }

        return object;
    }

    private parseCallExpr(caller: Expr): Expr {
        let callExpression: Expr = {kind: 'CallExpr', caller, arguments: this.parseArguments()} as CallExpr;

        if ((this.tokens[0] as Token).type == TokenType.OpenParen) {
            callExpression = this.parseCallExpr(callExpression);
        } else if ((this.tokens[0] as Token).type == TokenType.SemiColon) {
            this.tokens.shift();
        }

        return callExpression;
    }

    private parseArguments(): Array<Expr> {
        if ((this.tokens[0] as Token).type != TokenType.OpenParen) {
            throw `Expected a open parenthesis whilst parsing an argument list, instead got a ${(this.tokens[0] as Token).type}`;
        }

        this.tokens.shift();

        const args = ((this.tokens[0] as Token).type == TokenType.CloseParen) ? [] : this.parseArgumentList();
        
        if ((this.tokens[0] as Token).type != TokenType.CloseParen) {
            throw `Expected a closing parenthesis at the end of a argument list, instead got a ${(this.tokens[0] as Token).type}.`
        }

        this.tokens.shift();
        return args;
    }

    private parseArgumentList(): Array<Expr> {
        const args = [this.parseExpr()];

        while ((this.tokens[0] as Token).type == TokenType.Comma && this.tokens.shift()) {
            const value = this.parseExpr();
            args.push(value);

            if (value.kind == 'InfiniteExpr') {
                break;
            }
        }

        return args;
    }

    private parsePrimaryExpr(): Expr {
        switch((this.tokens[0] as Token).type) {
            case TokenType.OpenParen: {
                this.tokens.shift();

                const value = this.parseStmt();

                if (this.tokens[0].type != TokenType.CloseParen) {
                    throw `Expected a closing parenthesis, instead got a ${this.tokens[0].type}.`
                }

                this.tokens.shift();

                return value;
            }
            case TokenType.TripleDot: {
                this.tokens.shift();
                
                if ((this.tokens[0] as Token).type != TokenType.Identifier) {
                    throw `Expected a infinite expression to have a identifier after it, instead got a ${(this.tokens[0] as Token).type}.`;
                }

                return {kind: 'InfiniteExpr', name: (this.tokens.shift() as Token).value} as InfiniteExpr;
            }
            case TokenType.String:
                return {kind: 'StringLiteral', value: (this.tokens.shift() as Token).value} as StringLiteral;
            case TokenType.Identifier:
                return {kind: 'Identifier', symbol: (this.tokens.shift() as Token).value} as Identifier;
            case TokenType.Number:
                return {kind: 'NumericLiteral', value: parseFloat((this.tokens.shift() as Token).value)} as NumericLiteral;
            case TokenType.True:
                this.tokens.shift();

                return {kind: 'BooleanLiteral', value: true} as BooleanLiteral;
            case TokenType.False:
                this.tokens.shift();

                return {kind: 'BooleanLiteral', value: false} as BooleanLiteral;
            case TokenType.None:
                this.tokens.shift();

                return {kind: 'NoneLiteral', value: null} as NoneLiteral;
            case TokenType.OpenBrace:
            case TokenType.OpenBracket:
                return this.parseObjectExpr();
            default:
                throw `Token "${(this.tokens[0] as Token).type}" was not parsed.`;
        }
    }
}