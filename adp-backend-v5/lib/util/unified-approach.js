const _ = require('lodash');

/**
 * Retrieves data necessary for unified context.
 * Examples:
 * - for path 'a1.1.a2.2.a3.3.s3' parentPath='a1.1.a2.2.a3', index=3, indexes=[1,2,3]
 * - for path 'a1.1.a2.2.a3.3.a4' parentPath='a1.1.a2.2.a3', index=3., indexes=[1,2,3]
 * - for path 'a1.a2.a3.a4' (WITHOUT arrays) parentPath=null, index=null, indexes=null
 * More info: https://confluence.conceptant.com/display/DEV/Unified+Approach+to+Helper+Methods
 * @param appModel
 * @param {Object} row
 * @param {*} lodashPath
 */
function getParentInfo(appModel, row, lodashPath) {
  if (_.isEmpty(lodashPath)) {
    // lodashPath might be empty for root path, when transform is applied to Schema, not to field
    return { indexes: null, index: null, parentPath: null };
  }

  const arrIndexes = [];
  let lastArrPath;
  const curPath = [];
  let curAppModelPart = appModel;
  const lodashPathArr = lodashPath.split('.');

  let index;
  for (let i = 0; i < lodashPathArr.length; i++) {
    const field = lodashPathArr[i];
    curPath.push(field);
    curAppModelPart = curAppModelPart.fields[field];
    const { type } = curAppModelPart;
    if (type === 'AssociativeArray') {
      // for AssociativeArray key might be any string
      i++;
      const assocArrayKey = lodashPathArr[i];
      curPath.push(assocArrayKey);
    } else if (type === 'Array') {
      const isLastElem = i !== lodashPathArr.length - 1;
      if (isLastElem) {
        // if last elem is array then lastArrPath for it is penultimate array in the whole sequence
        lastArrPath = curPath.slice(0);
      }

      i++;
      index = lodashPathArr[i];
      if (index) {
        curPath.push(index);
        arrIndexes.push(index);
      }
    }
  }

  return {
    indexes: arrIndexes.length ? arrIndexes : null,
    index: lastArrPath ? +lodashPathArr[lastArrPath.length] : null,
    parentData: _.get(row, lastArrPath, null),
  };
}

/**
 * Get full path in app scheme including '.fields.'
 * @param fieldPath - does not include '.fields.' in path
 * @returns {string}
 */
function getSchemaPathByFieldPath(fieldPath) {
  const parts = fieldPath.split('.');
  const schemePath = ['fields'];
  _.each(parts, (part) => {
    const isArrIndexPart = /^\d+$/.test(part);
    if (!isArrIndexPart) {
      schemePath.push(part);
      schemePath.push('fields');
    }
  });
  // pop last 'fields' elem
  schemePath.pop();

  return schemePath.join('.');
}

module.exports = {
  getParentInfo,
  getSchemaPathByFieldPath,
};
