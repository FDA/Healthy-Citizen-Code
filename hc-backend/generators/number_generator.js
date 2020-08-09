"use strict";

module.exports.generate = (min = 0, max = 100) => {
    let rand = min - 0.5 + Math.random() * (max - min + 1);
    rand = Math.round(rand);
    return rand;
};
