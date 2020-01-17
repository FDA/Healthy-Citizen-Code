module.exports = ({ random }) => {
  return {
    scgImperialHeight() {
      const feet = random.integer(5, 6);
      const inches = random.integer(0, 12);
      return [feet, inches];
    },
    scgImperialWeight() {
      const lbs = random.integer(1, 10);
      return lbs;
    },
    scgImperialWeightWithOz() {
      const lbs = random.integer(1, 10);
      const ozs = random.integer(0, 10);
      return [lbs, ozs];
    },
    // scgBloodPressure() {},
  };
};
