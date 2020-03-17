module.exports = ({ batchName }) => {
  return {
    scgGeneratorBatchName() {
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
