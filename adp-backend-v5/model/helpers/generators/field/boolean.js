const values = [true, false, undefined];
const twoValTypeName = 'TrueFalse';
const threeValTypeName = 'TrueFalseUndefined';

module.exports = ({ random, ScgError }) => {
  return {
    scgBoolean() {
      const { type = twoValTypeName } = this.params;
      if (type === twoValTypeName) {
        return random.pick(values, 0, 2);
      }
      if (type === threeValTypeName) {
        return random.pick(values);
      }
      return new ScgError(`Param type should be one of ${twoValTypeName}, ${threeValTypeName}`);
    },
  };
};
