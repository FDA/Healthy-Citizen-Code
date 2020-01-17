const { buildLookupFromDoc, buildLookupsFromDocs } = require('./lookups');

function buildTreeSelectorFromDoc(doc, tableSpec) {
  const lookup = buildLookupFromDoc(doc, tableSpec);

  const isLeafFunc = new Function(`return ${tableSpec.leaves}`);
  lookup.isLeaf = isLeafFunc.call(doc);

  return lookup;
}

function buildTreeSelectorsFromDocs(docs, tableSpec) {
  const lookups = buildLookupsFromDocs(docs, tableSpec);
  const isLeafFunc = new Function(`return ${tableSpec.leaves}`);

  for (let i = 0; i < docs.length; i++) {
    const lookup = lookups[i];
    const doc = docs[i];
    lookup.isLeaf = isLeafFunc.call(doc);
  }
  return lookups;
}

module.exports = {
  buildTreeSelectorFromDoc,
  buildTreeSelectorsFromDocs,
};
