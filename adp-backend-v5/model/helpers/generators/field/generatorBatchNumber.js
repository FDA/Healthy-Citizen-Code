module.exports = ({ batchName }) => {
  return {
    scgGeneratorBatchNumber() {
      if (batchName) {
        // value passed to scg script
        return batchName;
      }
      if (this.params.value) {
        // field spec param
        return this.params.value;
      }

      return new Date().toISOString();
    },
  };
};
