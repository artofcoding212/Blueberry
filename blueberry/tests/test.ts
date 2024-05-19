import { Lexer } from '../lexer.ts';
import { Parser } from '../parser.ts';
import { Interpreter } from '../interpreter.ts';
import { Environment } from '../environment.ts';

while (true) {
    const input: string = prompt('> ', 'file "program" run') as string;
    const commands: Array<string> = input.split(' ');
    
    switch(commands[0]) {
        case 'file': {
            if (typeof commands[1] != 'string' && typeof commands[2] != 'string') {
                console.log('Invalid Command Form\nExpected a file name an a file command after the "file command."');
                break;
            }

            const fileName = (commands[1].split('')[0] == '"')
            ? commands[1].substring(1, commands[1].indexOf('"', 1)) 
            : commands[1];

            const contents = await Deno.readTextFile(`blueberry/tests/${fileName}.bb`);
            
            if (commands[2] == 'run') {
                const globalScope = new Environment();
                const parser = new Parser(new Lexer(contents).tokens).result;

                new Interpreter().interpret(parser, {'current': globalScope, 'global': globalScope});
            } else if (commands[2] == 'test') {
                const globalScope = new Environment();
                const parser = new Parser(new Lexer(contents).tokens).result;
                console.log('AST Tree: ', parser.body);

                const interpreter = new Interpreter(true);
                const interpreted = interpreter.interpret(parser, {'current': globalScope, 'global': globalScope});
                console.log('Output: ', interpreted);

                for (const log of interpreter.logs) {
                    console.log(log);
                };
            } else {
                console.log(`Invalid Command Input\nExpected "run" as the file command, instead got ${commands[2]}.`);
            }

            break;
        }
        case 'exit':
            Deno.exit(1);
            break;
    }
}