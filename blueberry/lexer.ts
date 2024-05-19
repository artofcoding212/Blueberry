export enum TokenType {
    // Keywords
    Var           = 'Var',
    Local         = 'Local',
    Global        = 'Global',
    True          = 'True',
    False         = 'False',
    None          = 'None',
    Print         = 'Print',
    Function      = 'Function',
    Return        = 'Return',
    If            = 'If',
    Else          = 'Else',
    Do            = 'Do',
    Static        = 'Static',
    Public        = 'Public',
    Private       = 'Private',
    Readonly      = 'Readonly',
    Constructor   = 'Constructor',
    New           = 'New',
    Class         = 'Class',

    // Literal Types
    Identifier    = 'Identifier',
    String        = 'String',
    Number        = 'Number',

    // Grouping / Operators
    CloseParen    = 'CloseParen',
    OpenParen     = 'OpenParen',
    CloseBracket  = 'CloseBracket',
    OpenBracket   = 'OpenBracket',
    CloseBrace    = 'CloseBrace',
    OpenBrace     = 'OpenBrace',
    Quotation     = 'Quotation',
    SemiColon     = 'SemiColon',
    Plus          = 'Plus',
    Minus         = 'Minus',
    Slash         = 'Slash',
    Star          = 'Star',
    DoubleStar    = 'DoubleStar',
    Percent       = 'Percent',
    Colon         = 'Colon',
    Comma         = 'Comma',
    Dot           = 'Dot',
    Equals        = 'Equals',
    DoubleEquals  = 'DoubleEquals',
    NotEquals     = 'NotEquals',
    Not           = 'Not',
    LessEquals    = 'LessEquals',
    Less          = 'Less',
    Greater       = 'Greater',
    GreaterEquals = 'GreaterEquals',
    And           = 'And',
    Or            = 'Or',
    While         = 'While',
    For           = 'For',
    TripleDot     = 'TripleDot',


    // Other
    EOF           = 'EOF'
}

export interface Token {
    type: TokenType,
    value: string
}

export const Keywords: Record<string, TokenType> = {
    'var': TokenType.Var,
    'local': TokenType.Local,
    'global': TokenType.Global,

    'while': TokenType.While,
    'for': TokenType.For,

    'function': TokenType.Function,
    'return': TokenType.Return,

    'class': TokenType.Class,
    'static': TokenType.Static,
    'public': TokenType.Public,
    'private': TokenType.Private,
    'readonly': TokenType.Readonly,
    'constructor': TokenType.Constructor,
    'new': TokenType.New,

    'do': TokenType.Do,

    'if': TokenType.If,
    'else': TokenType.Else,

    'true': TokenType.True,
    'false': TokenType.False,

    'none': TokenType.None,

    'print': TokenType.Print
}

export class Lexer {
    private src: Array<string>;
    public readonly tokens: Array<Token> = new Array<Token>();

    private alphabetic(text: string): boolean {
        return (text.toUpperCase() != text.toLowerCase());
    }

    private numeric(text: string): boolean {
        const character = text.charCodeAt(0);

        return (character >= '0'.charCodeAt(0) && character <= '9'.charCodeAt(0));
    }

    private skippable(text: string): boolean {
        return (text == '\n' || text == '\t' || text == '\r')
    }

    private string() {
        const start = this.src.shift() as string;
        let value = '';

        while (typeof this.src[0] == 'string' && this.src[0] != '"' && this.src[0] != '\'') {
            value = value + this.src.shift() as string;
        }

        if (typeof this.src[0] != 'string') {
            throw 'An endless string was provided.';
        }

        if ((this.src[0] as string) != start) {
            throw `Expected a string to end with ${start}, instead got ${this.src[0] as string}.`;
        }

        this.src.shift();
        this.tokens.push({type: TokenType.String, value});
    }

    private comment() {
        this.src.shift();

        if (typeof this.src[0] == 'string') {
            switch(this.src[0] as string) {
                case '>': {
                    this.src.shift();

                    let comment = "";

                    while (typeof this.src[0] == 'string' && !this.skippable(this.src[0])) {
                        comment += this.src.shift() as string;
                    }

                    break;
                }
                case '!': {
                    this.src.shift();

                    let comment = "";

                    while (typeof this.src[0] == 'string' && !comment.endsWith('!<')) {
                        comment += this.src.shift() as string;
                    }

                    if (!comment.endsWith('!<')) {
                        throw `A block comment must be ended with "!<".`;
                    }

                    break;
                }
                default:
                    throw `Expected ">" or "!" after a comment starter, instead got ${this.src[0]}.`;
            }
        }
    }

    public constructor(source: string) {
        this.src = source.split('');

        while (this.src.length > 0) {
            switch(this.src[0]) {
                case '\'': case '"':
                    this.string();
                    break;
                case '.':
                    if (this.src[1] == '.' && this.src[2] == '.') {
                        this.tokens.push({
                            type: TokenType.TripleDot,
                            value: this.src.shift() as string + this.src.shift() as string + this.src.shift() as string
                        });
                        break;
                    }
                    this.tokens.push({
                        type: TokenType.Dot,
                        value: this.src.shift() as string
                    });
                    break;
                case '[':
                    this.tokens.push({
                        type: TokenType.OpenBracket,
                        value: this.src.shift() as string
                    });
                    break;
                case ']':
                    this.tokens.push({
                        type: TokenType.CloseBracket,
                        value: this.src.shift() as string
                    });
                    break;
                case ',':
                    this.tokens.push({
                        type: TokenType.Comma,
                        value: this.src.shift() as string
                    });
                    break;
                case '{':
                    this.tokens.push({
                        type: TokenType.OpenBrace,
                        value: this.src.shift() as string
                    });

                    break;
                case '}':
                    this.tokens.push({
                        type: TokenType.CloseBrace,
                        value: this.src.shift() as string
                    });
    
                    break;
                case ':':
                    this.tokens.push({
                        type: TokenType.Colon,
                        value: this.src.shift() as string
                    } as Token);

                    break;
                case '(':
                    this.tokens.push({
                        type: TokenType.OpenParen,
                        value: this.src.shift() as string
                    });

                    break;
                case ')':
                    this.tokens.push({
                        type: TokenType.CloseParen,
                        value: this.src.shift() as string
                    });

                    break;
                case '=': {
                    if (this.src[1] == '=') {
                        this.tokens.push({
                            type: TokenType.DoubleEquals,
                            value: this.src.shift() as string + this.src.shift() as string
                        });

                        break;
                    }

                    this.tokens.push({
                        type: TokenType.Equals,
                        value: this.src.shift() as string
                    });

                    break;
                }
                case '!': {
                    if (this.src[1] == '=') {
                        this.tokens.push({
                            type: TokenType.NotEquals,
                            value: this.src.shift() as string + this.src.shift() as string
                        });

                        break;
                    }

                    this.tokens.push({
                        type: TokenType.Not,
                        value: this.src.shift() as string
                    });

                    break;
                }
                case '<': {
                    if (this.src[1] == '=') {
                        this.tokens.push({
                            type: TokenType.LessEquals,
                            value: this.src.shift() as string + this.src.shift() as string
                        });

                        break;
                    }

                    this.tokens.push({
                        type: TokenType.Less,
                        value: this.src.shift() as string
                    });

                    break;
                }
                case '>': {
                    switch(this.src[1]) {
                        case '=':
                            this.tokens.push({
                                type: TokenType.GreaterEquals,
                                value: this.src.shift() as string + this.src.shift() as string
                            });
                            break;
                        case '>': case '!':
                            this.comment();
                            break;
                        default:
                            this.tokens.push({
                                type: TokenType.Greater,
                                value: this.src.shift() as string
                            });
                            break;
                    }

                    break;
                }
                case '&': {
                    if (this.src[1] == '&') {
                        this.tokens.push({
                            type: TokenType.And,
                            value: this.src.shift() as string + this.src.shift() as string
                        });
                        break;
                    } else {
                        throw 'The & symbol can only be followed by another & symbol.';
                    }
                }
                case '|': {
                    if (this.src[1] == '|') {
                        this.tokens.push({
                            type: TokenType.Or,
                            value: this.src.shift() as string + this.src.shift() as string
                        });
                        break;
                    } else {
                        throw 'The | symbol can only be followed by another | symbol.';
                    }
                }
                case '+':
                    this.tokens.push({
                        type: TokenType.Plus,
                        value: this.src.shift() as string
                    });

                    break;
                case '-':
                    this.tokens.push({
                        type: TokenType.Minus,
                        value: this.src.shift() as string
                    });

                    break;
                case '/':
                    this.tokens.push({
                        type: TokenType.Slash,
                        value: this.src.shift() as string
                    });

                    break;
                case '%':
                        this.tokens.push({
                            type: TokenType.Percent,
                            value: this.src.shift() as string
                        });

                        break;
                case '*':
                    if (this.src[1] == '*') {
                        this.tokens.push({
                            type: TokenType.DoubleStar,
                            value: this.src.shift() as string + this.src.shift() as string
                        });

                        break;
                    }

                    this.tokens.push({
                        type: TokenType.Star,
                        value: this.src.shift() as string
                    });

                    break;
                case ';':
                    this.tokens.push({
                        type: TokenType.SemiColon,
                        value: this.src.shift() as string
                    });

                    break;
                default: {
                    if (this.numeric(this.src[0])) {
                        let number = '';
                        let decimals = 0;

                        while (this.src.length > 0 && (this.numeric(this.src[0]) || (this.src[0] as string) == '.') || (this.src[0] as string) == '_') {
                            if (this.src[0] as string != '_') {
                                number += this.src.shift();
                            } else {
                                this.src.shift();
                            }

                            if (this.src[0] == '.') {
                                decimals++;

                                if (decimals > 1) {
                                    throw 'A number cannot have over 1 decimal.';
                                }
                            }
                        }

                        this.tokens.push({
                            type: TokenType.Number,
                            value: number
                        });
                    } else if (this.alphabetic(this.src[0])) {
                        let identifier = '';

                        while (this.src.length > 0 && (this.alphabetic(this.src[0]) || this.numeric(this.src[0]))) {
                            identifier += this.src.shift();
                        }

                        if (typeof Keywords[identifier] == 'string') {
                            this.tokens.push({
                                type: Keywords[identifier],
                                value: identifier
                            });
                        } else {
                            this.tokens.push({
                                type: TokenType.Identifier,
                                value: identifier
                            });
                        }
                    } else if (this.skippable(this.src[0]) || this.src[0] == ' ') {
                        this.src.shift();
                    } else {
                        throw `Character ${this.src[0]} is not a valid character.`;
                    }

                    break;
                }
            }
        }

        this.tokens.push({
            type: TokenType.EOF,
            value: 'EOF'
        });
    }
}