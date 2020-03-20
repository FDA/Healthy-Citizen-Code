/*
This generator allows "compounding" other generators and static values with given probabilities. It's call has the following format:
{
  generator: "scgCompound"
    params: {
      probabilities: [
        {probability: P2, value: V1},
        {probability: P2, value: V2},
        {probability: P3, function: F3, params: {...}},
        ...
        {function: Fdefault}
      ]
    }
}
  I.e. the parameter is the array of probabilities of each value appearance. Each element of the array has the following attributes:
  - probability - the probability in [0.0,1.0] range with which the selected value should appear in the output record's field.
    If the probability is not specified or is less than 0 then this entry become default. I.e. its value becomes assigned
    to all outputs that were not assigned according to the previous entries
  - value - a static value to be used as the value of the output.
  - function - if the value is not specified that "function" could be specified. This function will be called in order
    to generate the output value. The function can be called with parameters included in the probability entry.
    If neither value nor function are specified then the output value is undefined/unset
  The coumpound generator processes the array of probabilities from the top to the bottom and when it selects a certain
  entry to be the output it stops processing the rest of entries. So if all entries have the probabilities selected and
  the sum of probabilities S is less than 1.0 and there is no default entry, then with probability 1-S the output will
  be undefined/unset.
  NOTE: if somehow the sum of all probabilities S is greater than 1.0, then all entries after the one that caps the
  1.0 sum of probabilities will never be used.
  NOTE: keep "return undefined in the code to make it more understandable. Yes, I know it's not required
  NOTE: using archaic for loop instead of fancy lodash _.each or array.forEach to keep things simpler :)
 */
const _ = require('lodash');

module.exports = () => {
  return {
    scgCompound() {
      const { probabilities = [] } = this.params;
      const rnd = Math.random();
      let acc = 0;
      let spec;
      for (const i in probabilities) {
        if (Object.prototype.hasOwnProperty.call(probabilities, i)) {
          spec = probabilities[i];
          acc += _.get(spec, 'probability', 0);
          if (acc > rnd || _.get(spec, 'probability', -1) < 0) {
            if (spec.value) {
              return spec.value;
            }
            if (spec.function) {
              this.params = spec.params;
              return this.generators[spec.function].call(this);
            }
            return undefined; // if neither value nor function are specified then keep the output undefined
          }
        }
      }
      return undefined; // return nothing if none of the probabilies generated the output
    },
  };
};
