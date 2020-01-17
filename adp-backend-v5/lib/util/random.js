const { Random } = require('random-js');
// From documentation: "It is recommended to create one shared engine and/or Random instance per-process rather than one per file."
const random = new Random();

const Chance = require('chance');

const chance = new Chance();

module.exports = {
  random,
  chance,
};
