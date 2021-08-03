const _ = require('lodash');

// Get order of collections which are specified in lookups/treeseletors
function getCollectionOrder(collections, lookupFieldsMeta, excludedCollections = []) {
  const tree = buildSimpleTree(lookupFieldsMeta);
  makeDeepTreeWithNoLoops(tree);
  const dependentCollectionOrder = getDependentCollectionOrder(tree);
  return getOverallCollectionOrder(collections, dependentCollectionOrder, excludedCollections);
}

function getOverallCollectionOrder(allCollections, dependentCollectionOrder, excludedCollections) {
  excludedCollections.forEach((t) => dependentCollectionOrder.delete(t));

  const independentCollections = new Set();
  _.each(allCollections, (collectionName) => {
    if (!dependentCollectionOrder.has(collectionName) && !excludedCollections.includes(collectionName)) {
      independentCollections.add(collectionName);
    }
  });
  return new Set([...independentCollections, ...dependentCollectionOrder]);
}

function buildSimpleTree(lookupFieldsMeta) {
  const tree = {};
  _.each(lookupFieldsMeta, (fieldsLookups, sourceCollection) => {
    _.each(fieldsLookups, (lookupInfo) => {
      const { collection } = lookupInfo;
      _.each(collection, (collectionInfo, collectionName) => {
        // There may be multiple fields with same sourceCollection->collection relation
        // For now it does not matter.
        // const obj = {collection: collectionName, path: [sourceCollection, collectionName]};
        const obj = {};
        _.set(tree, [sourceCollection, collectionName], obj);
      });
    });
  });
  return tree;
}

function makeDeepTreeWithNoLoops(tree) {
  const setDependencies = (collectionObj, path) => {
    _.each(collectionObj, (nestedCollectionObj, nestedCollectionName) => {
      if (path.has(nestedCollectionName)) {
        // console.log(`Found loop for path: '${[...path].join('.')}', new elem '${nestedCollectionName}' creates loop.`);
        delete collectionObj[nestedCollectionName];
        return;
      }
      collectionObj[nestedCollectionName] = tree[nestedCollectionName] || {};
      const nestedPath = new Set(path);
      nestedPath.add(nestedCollectionName);
      setDependencies(collectionObj[nestedCollectionName], nestedPath);
    });
  };
  setDependencies(tree, new Set());
}

function getDependentCollectionOrder(tree) {
  const collectionsByLevels = [];
  const traverse = (obj) => {
    const collections = Object.keys(obj);
    collections.length && collectionsByLevels.push(collections);
    const nestedObjs = Object.values(obj);
    _.each(nestedObjs, traverse);
  };
  traverse(tree);

  const order = new Set();
  // add "deepest" i.e. independent collections first
  for (let i = collectionsByLevels.length - 1; i >= 0; i--) {
    collectionsByLevels[i].forEach((collection) => order.add(collection));
  }

  return order;
}
module.exports = {
  getCollectionOrder,
};
