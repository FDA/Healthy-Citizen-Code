module.exports = ({ random }) => {
  return {
    scgCurrency() {
      const { min = -1000000, max = 1000000 } = this.params;
      return random.integer(min, max);
    },
  };
};
