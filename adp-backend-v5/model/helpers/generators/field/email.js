module.exports = ({ random, chance }) => {
  return {
    scgEmail() {
      const { domains = ['conceptant.com'] } = this.params;
      return chance.email({ domain: random.pick(domains) });
    },
  };
};
