"use strict";

module.exports.generate = () => {
    let rand = Math.round((Math.random()*10) + 1);
    rand = !!(Math.round(rand) % 2);
    return rand;
};
