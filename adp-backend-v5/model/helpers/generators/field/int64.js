module.exports = ({ random }) => {
  return {
    scgInt64() {
      const { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = this.params;
      return random.integer(min, max);
    },
  };
};
