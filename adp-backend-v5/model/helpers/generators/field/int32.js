module.exports = ({ random }) => {
  return {
    scgInt32() {
      const { min = -0x80000000, max = 0x7fffffff } = this.params;
      return random.integer(min, max);
    },
  };
};
