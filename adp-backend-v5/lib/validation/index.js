const _ = require('lodash');
const { JSONPath } = require('jsonpath-plus');
const Promise = require('bluebird');
const { sortObjectByKeys, MONGO, expandObjectAsKeyValueList } = require('../util/util');
const { getLabelOrDataValue } = require('../util/lookups');
const { ValidationError } = require('../errors');

module.exports = appLib => {
  const m = {};

  m.validateNewItem = async (context, newItem) => {
    const { modelName, userPermissions, inlineContext } = context;
    const listErrors = await appLib.accessUtil.validateListsValues(modelName, newItem, userPermissions, inlineContext);
    if (!_.isEmpty(listErrors)) {
      throw new ValidationError(`Incorrect request: ${listErrors.join(' ')}`);
    }

    appLib.controllerUtil.transformLookupKeys(newItem, modelName);
    await m.checkIsTreeSelectorValid(newItem, modelName);
    await m.checkIsLookupValid(newItem, modelName);
  };

  m.validateListsValues = (modelName, data, userPermissions, inlineContext) => {
    const listsErrors = [];
    // if (!appLib.getAuthSettings().enablePermissions) {
    //   return listsErrors;
    // }

    const fieldsPathInAppModel = `${modelName}.fields`;

    // transform relative paths of req.body to absolute paths
    const userData = _.reduce(
      data,
      (result, val, key) => {
        const fullPath = `${fieldsPathInAppModel}.${key}`;
        result[fullPath] = val;
        return result;
      },
      {}
    );

    const schemaListsFields = appLib.ListsFields.filter(path => path.startsWith(fieldsPathInAppModel));
    const schemaAllowedLists = appLib.accessUtil.getListsForUser(userPermissions, inlineContext, schemaListsFields);
    _.each(schemaAllowedLists, (list, fieldPath) => {
      const userVal = userData[fieldPath];

      if (_.isEmpty(userVal) && list.required) {
        listsErrors.push(`Required value must be set for '${fieldPath}'.`);
        return;
      }

      if (list.type.endsWith('[]')) {
        // check array type
        if (!Array.isArray(userVal)) {
          listsErrors.push(`Value '${userVal}' should be an array for '${fieldPath}'.`);
        } else {
          userVal.forEach(val => {
            if (!list.values[val]) {
              listsErrors.push(`Value '${val}' is not allowed for '${fieldPath}'.`);
            }
          });
        }
      } else if (userVal && !list.values[userVal]) {
        listsErrors.push(`Value '${userVal}' is not allowed for '${fieldPath}'.`);
      }
    });
    return listsErrors;
  };

  m.checkIsTreeSelectorValid = async (item, modelName) => {
    const modelTreeSelectors = _.get(appLib.treeSelectorFieldsMeta, modelName);
    const checkTreeSelectorPromises = [];

    const actualRecordCond = appLib.dba.getConditionForActualRecord();
    _.each(modelTreeSelectors, (treeSelectorMeta, itemPath) => {
      const { jsonPath } = treeSelectorMeta.paths;
      const singleTableMeta = Object.values(treeSelectorMeta.table)[0];
      const treeSelectorResult = JSONPath({ path: jsonPath, json: item });

      _.each(treeSelectorResult, treeSelectorData => {
        const { parent, isLeaf, requireLeafSelection, foreignKey, table } = singleTableMeta;
        const lastChildId = treeSelectorData[treeSelectorData.length - 1]._id;
        const [fromField, toField] = Object.entries(parent)[0];
        const checkPromise = appLib.db
          .model(table)
          .aggregate([
            { $match: { ...actualRecordCond, [foreignKey]: lastChildId } },
            {
              $graphLookup: {
                from: table,
                startWith: `$${fromField}`,
                connectFromField: fromField,
                connectToField: toField,
                as: 'tree',
                restrictSearchWithMatch: actualRecordCond,
              },
            },
          ])
          .then(docs => {
            if (!docs.length) {
              return { [itemPath]: `Unable to find a chain` };
            }

            const doc = docs[0];
            const expectedTree = treeSelectorData.slice(0, -1);
            const expectedIds = expectedTree.map(node =>
              node._id.constructor.name === 'ObjectID' ? node._id.toString() : node._id
            );
            const realIds = doc.tree.map(node =>
              node._id.constructor.name === 'ObjectID' ? node._id.toString() : node._id
            );
            if (!_.isEqual(expectedIds, realIds)) {
              return { [itemPath]: `Invalid chain` };
            }

            if (requireLeafSelection) {
              try {
                if (!isLeaf.call(doc)) {
                  return { [itemPath]: `Last element must be a leaf` };
                }
              } catch (e) {
                return { [itemPath]: `Invalid leaf specification` };
              }
            }
          });

        checkTreeSelectorPromises.push(checkPromise);
      });
    });

    const errors = await Promise.all(checkTreeSelectorPromises);
    const fieldToErrorMap = _.merge(...errors);
    if (!_.isEmpty(fieldToErrorMap)) {
      const fieldToErrorMapSorted = sortObjectByKeys(fieldToErrorMap);
      const errorFields = _.map(fieldToErrorMapSorted, (error, field) => `${error} for field "${field}"`, '').join(
        '. '
      );
      throw new ValidationError(`Found invalid tree selector data: ${errorFields}`, fieldToErrorMap);
    }
  };
  /**
   * Checks lookup existence for LookupObjectID. LookupObjectID[], TreeSelector fields inside item.
   * Checks whether sent label matches correct label.
   * Throws ValidationError if there are errors.
   * @param item
   * @param modelName
   * @returns {Promise}
   */
  m.checkIsLookupValid = async (item, modelName) => {
    const lookupFieldsMeta = _.get(appLib.lookupObjectIdFieldsMeta, modelName);
    const checkLookupPromises = [];
    const conditionForActualRecord = appLib.dba.getConditionForActualRecord();

    _.each(lookupFieldsMeta, (lookupMeta, itemPath) => {
      const { jsonPath } = lookupMeta.paths;
      const lookupVals = JSONPath({ path: jsonPath, json: item });
      const lookups = _.flatten(lookupVals).filter(l => l);

      const promise = Promise.map(lookups, async lookupObj => {
        const { table, _id } = lookupObj;
        const lookupTableMeta = lookupMeta.table[table];
        if (!lookupTableMeta) {
          return `Lookup meta for collection ${table} does not exist.`;
        }
        const condition = MONGO.and(conditionForActualRecord, {
          [lookupTableMeta.foreignKey]: _id,
        });

        const doc = await appLib.db.collection(table).findOne(condition);

        if (!doc) {
          return `Lookup with _id '${_id.toString()}' in collection ${table} does not exist.`;
        }
        lookupObj.label = getLabelOrDataValue(doc, lookupTableMeta.label);

        _.each(lookupTableMeta.data, (dataExpr, dataFieldName) => {
          _.set(lookupObj, `data.${dataFieldName}`, getLabelOrDataValue(doc, dataExpr));
        });
      }).then(errors => {
        const errMessages = errors.filter(msg => msg);
        if (errMessages.length) {
          return { [itemPath]: errMessages };
        }
      });

      checkLookupPromises.push(promise);
    });

    if (!checkLookupPromises.length) {
      return;
    }

    const errors = await Promise.all(checkLookupPromises);
    const fieldToErrorMap = _.merge(...errors);
    if (!_.isEmpty(fieldToErrorMap)) {
      throw new ValidationError(
        `Found invalid lookups sent in fields:\n${expandObjectAsKeyValueList(fieldToErrorMap)}`
      );
    }
  };

  return m;
};
