module.exports = ({ random, chance }) => {
  return {
    scgUrl() {
      const { domains } = this.params;
      if (domains) {
        const domain = random.pick(domains);
        return chance.url({ domain });
      }
      return chance.url();
    },
  };
};
