module.exports = ({ random }) => {
  return {
    scgAlphanumericCode() {
      const { min = 1, max = 20 } = this.params;
      return random.string(random.integer(min, max), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
    },
  };
};
