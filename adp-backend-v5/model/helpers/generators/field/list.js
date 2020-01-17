const _ = require('lodash');

module.exports = ({ random }) => {
  function selectValuesFromList(isArrayList, list) {
    if (_.isEmpty(list)) {
      return;
    }

    if (isArrayList) {
      const count = random.integer(1, list.length);
      return random.sample(list, count);
    }
    return random.pick(list);
  }

  return {
    scgList() {
      const { isArrayList, listKeys } = this.params;
      return selectValuesFromList(isArrayList, listKeys);
    },
    scgDynamicList() {
      const { isArrayList, listKeys } = this.params;
      return selectValuesFromList(isArrayList, listKeys);
    },
  };
};
