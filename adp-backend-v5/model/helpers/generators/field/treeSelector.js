const mongoose = require('mongoose');
const { buildTreeSelectorFromDoc } = require('../../../../lib/util/treeselectors');

module.exports = () => {
  async function getTreeSelector(tableSpec) {
    // ignore 'where', 'parent', 'roots', 'requireLeafSelection' for now
    // TODO: resolve params above, generate by specified nesting levels, generate leaf/not leaf.
    const treeSelectorTable = tableSpec.table;
    const docs = await mongoose
      .model(treeSelectorTable)
      .aggregate([{ $sample: { size: 1 } }])
      .exec();

    if (!docs.length) {
      return;
    }
    return buildTreeSelectorFromDoc(docs[0], tableSpec);
  }

  return {
    async scgTreeSelector() {
      const { tableSpec } = this.params;
      const result = await getTreeSelector(tableSpec);
      if (!result) {
        console.warn(`No treeSelector docs found for table ${tableSpec.table}`);
        return;
      }

      return result;
    },
  };
};
