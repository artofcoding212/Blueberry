>> Variables
local variable1 = "Hello, world!";
global variable2 = variable1;
var: myScope variable3 = variable2;

>> Comments
>> Line Comment
>!
    Block comment
!<

>> Keywords
print "This is a " + "print" + " expression!";

function add(x, y) {
    return x + y;
}

if (true) {
    print 2 + 2;
} else {
    print 4 + 4;
}

while (index < 5; var index;) {
    print index;
}

for (var index = 1; (index > 0 && index < 4); index = index + 1) {
    print index;
}

do {
    print "Hello, world!";
}

class Class {
    private variable; public variable;
    public static method() {} private method() {}
}

new Class();

>> Call Expressions
variable1("This", "is", "a", "call", "expression.");
foo.bar.variable2("This", "is", "also", "a", "call", "expression.");

>> Grouping / Operators
() ["value"] {"key": "value"} "" ''
+ - * / % = : > < >= <= == != ! || &&

>> Literals
true false none
identifier123abc
100_000_000.50000
"string"