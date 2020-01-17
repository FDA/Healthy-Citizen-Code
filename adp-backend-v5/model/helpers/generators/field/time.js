const msInDay = 86400000; // = 24 * 60 * 60 * 1000

module.exports = ({ random }) => {
  return {
    scgTime() {
      // TODO: format of value to return?
      return new Date(random.integer(0, msInDay));
    },
  };
};
