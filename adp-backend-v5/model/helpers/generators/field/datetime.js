module.exports = ({ random }) => {
  function scgDateTime({ min = new Date(0), max = new Date() } = {}) {
    return new Date(random.integer(min.getTime(), max.getTime()));
  }

  function scgDeletedAt() {
    const { ratio = 0.9 } = this.params;
    const isEpochDate = random.bool(ratio);
    return isEpochDate ? new Date(0) : scgDateTime();
  }

  return { scgDateTime, scgDeletedAt };
};
