"use strict";

/*
 Array with dependencies in phi schema.
 path: path do object with dependencies, for example: ["encounters", 0, "diagnosis"]
 Will be re-generated RIGHT operand! Please don't forget about this rule when you will create your dependencies.
 */

var phiDependencies = [
    {
        "path": ["products", 0],
        "leftOperand": "start",
        "operation" : "<",
        "rightOperand": "end",
        "type": "Date"
    },
    {
        "path": ["enrollment", 0],
        "leftOperand": "start",
        "operation" : "<",
        "rightOperand": "end",
        "type": "Date"
    }
];
module.exports.phiDependecies = phiDependencies;