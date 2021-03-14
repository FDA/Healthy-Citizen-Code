const _ = require('lodash');
const { buildLookupFromDoc } = require('../../../../lib/util/lookups');

module.exports = ({ random, db, dba }) => {
  async function getLookup(lookupTableSpec) {
    // ignore where in each table lookup for now
    const lookupTable = lookupTableSpec.table;
    const docs = await db
      .collection(lookupTable)
      .aggregate([{ $sample: { size: 1 } }])
      .toArray();

    if (!docs.length) {
      return;
    }

    const userContext = {};
    await dba.postTransform(docs, lookupTable, userContext);

    const doc = docs[0];
    return buildLookupFromDoc(doc, lookupTableSpec);
  }

  return {
    async scgLookupObjectID() {
      const { lookup } = this.params;
      const lookupTables = _.keys(lookup.table);

      while (lookupTables.length) {
        const tableIndex = random.integer(0, lookupTables.length - 1);
        const lookupTable = lookupTables[tableIndex];
        const lookupTableSpec = lookup.table[lookupTable];
        const result = await getLookup(lookupTableSpec);
        if (result) {
          return result;
        }
        // exclude table with no suitable docs
        lookupTables.splice(tableIndex, 1);
      }

      console.warn(`No lookup docs found for tables ${_.keys(lookup.table).join(', ')}`);
    },
  };
};
