const _ = require('lodash');

module.exports = () => {
  return {
    /* This generator accepts single parameter "from" and copies the value of field called "from" into the current field.
     * IMPORTANT: make sure that the field from which the copy is read is already set
     */
    scgCopy() {
      const { from = false } = this.params;
      if (from) {
        return _.get(this, `row.${from}`);
      }
    },
  };
};
