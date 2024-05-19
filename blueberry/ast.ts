export type NodeType =
    // Expressions
    | 'NumericLiteral'
    | 'BooleanLiteral'
    | 'NoneLiteral'
    | 'StringLiteral'
    | 'Identifier'
    | 'BinaryExpr'
    | 'AssignmentExpr'
    | 'ArrayPropertyExpr'
    | 'ArrayExpr'
    | 'ObjectPropertyExpr'
    | 'ObjectExpr'
    | 'LogicalExpr'
    | 'MemberExpr'
    | 'CallExpr'
    | 'UnaryExpr'
    | 'DoExpr'
    | 'InfiniteExpr'
    | 'NewExpr'

    // Statments
    | 'Program'
    | 'ReturnStmt'
    | 'VariableDeclaration'
    | 'FunctionDeclaration'
    | 'ClassDeclaration'
    | 'ClassMethod'
    | 'ClassVariable'
    | 'BlockStmt'
    | 'PrintStmt'
    | 'IfStmt'
    | 'WhileStmt'
    | 'ForStmt'

export interface Stmt {
    kind: NodeType
}

export interface Program extends Stmt {
    kind: 'Program',
    body: Array<Stmt>
}

export interface ForStmt extends Stmt {
    kind: 'ForStmt',
    initializer: Expr,
    condition: Expr,
    incrementor: Expr,
    body: Array<Stmt>
}

export interface WhileStmt extends Stmt {
    kind: 'WhileStmt',
    condition: Expr,
    variable?: VariableDeclaration,
    body: Array<Stmt>
}

export interface BlockStmt extends Stmt {
    kind: 'BlockStmt',
    body: Array<Stmt>
}

export interface IfStmt extends Stmt {
    kind: 'IfStmt',
    condition: Expr,
    thenBranch: Stmt,
    elseBranch?: Stmt
}

export interface ReturnStmt extends Stmt {
    kind: 'ReturnStmt',
    value: Expr
}

export interface FunctionDeclaration extends Stmt {
    kind: 'FunctionDeclaration',
    parameters: Array<string>,
    minimumLength: number,
    infiniteName?: string,
    name?: string,
    body: Array<Stmt>
}

export interface ClassMethod extends Stmt {
    kind: 'ClassMethod',
    isStatic: boolean,
    isPrivate: boolean,
    parameters: Array<string>,
    minimumLength: number,
    infiniteName?: string,
    name: string | null,
    body: Array<Stmt>
}

export interface ClassVariable extends Stmt {
    kind: 'ClassVariable',
    isPrivate: boolean,
    isReadonly: boolean,
    identifier: string,
    value?: Expr
}

export interface ClassDeclaration extends Stmt {
    kind: 'ClassDeclaration',
    initializer?: Stmt,
    publicVariables: Array<Stmt>,
    privateVariables: Array<Stmt>,
    name: string
}

export interface VariableDeclaration extends Stmt {
    kind: 'VariableDeclaration',

    identifier: string,
    global: boolean,
    value?: Expr,
    scope?: string
}

export interface PrintStmt extends Stmt {
    kind: 'PrintStmt',
    output: Array<Expr>
}

export interface Expr extends Stmt {
    kind: NodeType
}

export interface NewExpr extends Expr {
    kind: 'NewExpr',
    name: string,
    parameters: Array<Expr>
}

export interface InfiniteExpr extends Expr {
    kind: 'InfiniteExpr',
    name: string
}

export interface DoExpr extends Expr {
    kind: 'DoExpr',
    body: BlockStmt
}

export interface BinaryExpr extends Expr {
    kind: 'BinaryExpr',

    left: Expr,
    right: Expr,
    operator: string
}

export interface UnaryExpr extends Expr {
    kind: 'UnaryExpr',
    right: Expr,
    operator: string
}

export interface CallExpr extends Expr {
    kind: 'CallExpr',
    arguments: Array<Expr>,
    caller: Expr
}

export interface MemberExpr extends Expr {
    kind: 'MemberExpr',
    object: Expr,
    property: Expr,
    computed: boolean
}

export interface AssignmentExpr extends Expr {
    kind: 'AssignmentExpr',
    assignee: Expr,
    value: Expr
}

export interface LogicalExpr extends Expr {
    kind: 'LogicalExpr',
    left: Expr,
    right: Expr,
    comparator: string
}

export interface Identifier extends Expr {
    kind: 'Identifier',
    symbol: string
}

export interface ObjectPropertyExpr extends Expr {
    kind: 'ObjectPropertyExpr',
    key: string,
    value?: Expr
}

export interface ObjectExpr extends Expr {
    kind: 'ObjectExpr',
    properties: Array<ObjectPropertyExpr>
}

export interface ArrayPropertyExpr extends Expr {
    kind: 'ArrayPropertyExpr',
    index: number,
    value: Expr
}

export interface ArrayExpr extends Expr {
    kind: 'ArrayExpr',
    properties: Array<ArrayPropertyExpr>
}

export interface BooleanLiteral extends Expr {
    kind: 'BooleanLiteral',
    value: boolean
}

export interface NoneLiteral extends Expr {
    kind: 'NoneLiteral',
    value: null
}

export interface StringLiteral extends Expr {
    kind: 'StringLiteral',
    value: string
}

export interface NumericLiteral extends Expr {
    kind: 'NumericLiteral',
    value: number
}