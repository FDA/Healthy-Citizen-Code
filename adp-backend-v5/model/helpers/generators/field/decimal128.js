const { Decimal128 } = require('bson');

module.exports = ({ random }) => {
  return {
    scgDecimal128() {
      // with Number.MIN_SAFE_INTEGER and Number.MAX_SAFE_INTEGER random.real always generates integer, this is why range is narrower
      const { min = -1000000000, max = 1000000000 } = this.params;
      const number = random.real(min, max);
      return Decimal128.fromString(number.toString());
    },
  };
};
