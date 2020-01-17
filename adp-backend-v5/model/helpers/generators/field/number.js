module.exports = ({ random }) => {
  return {
    scgNumber() {
      const { min = 0, max = 9007199254740992 } = this.params;
      return random.integer(min, max);
    },
  };
};
