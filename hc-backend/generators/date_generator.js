"use strict";
var numberGenerator = require('./number_generator').generate;

module.exports.generate = function (minDate = "1 1 1971", maxDate = "1 1 2030") {
    var minD = new Date(minDate).getTime();
    var maxD = new Date(maxDate).getTime();
    var random = numberGenerator(minD, maxD);
    var randomDate = new Date(random);
    return randomDate;
};