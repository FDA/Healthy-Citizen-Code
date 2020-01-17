const msInDay = 86400000; // = 24 * 60 * 60 * 1000

function getUTCDate(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

module.exports = ({ random }) => {
  return {
    scgDate() {
      const { min = new Date(0), max = new Date() } = this.params;
      const minDate = getUTCDate(min);
      const maxDate = getUTCDate(max);
      const diffDays = Math.floor((maxDate - minDate) / msInDay);
      const chosenDay = random.integer(0, diffDays);
      return new Date(minDate.getTime() + chosenDay * msInDay);
    },
  };
};
