const { buildTreeSelectorFromDoc } = require('../../../../lib/util/treeselectors');

module.exports = ({ db, dba }) => {
  async function getTreeSelector(tableSpec) {
    // ignore 'where', 'parent', 'roots', 'requireLeafSelection' for now
    // TODO: resolve params above, generate by specified nesting levels, generate leaf/not leaf.
    const treeSelectorTable = tableSpec.table;
    const docs = await db
      .collection(treeSelectorTable)
      .aggregate([{ $sample: { size: 1 } }])
      .toArray();

    if (!docs.length) {
      return;
    }
    const userContext = {};
    await dba.postTransform(docs, treeSelectorTable, userContext);

    const doc = docs[0];
    return buildTreeSelectorFromDoc(doc, tableSpec);
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
