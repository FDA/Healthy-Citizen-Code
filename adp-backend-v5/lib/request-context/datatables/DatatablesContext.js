const _ = require('lodash');
const mongoose = require('mongoose');
const { ObjectID } = require('mongodb');
const { getUrlParts, MONGO, updateSearchConditions } = require('../../util/util');
const BaseContext = require('../BaseContext');
const { getLimit } = require('../util');
const ValidationError = require('../../errors/validation-error');

module.exports = class DatatablesContext extends BaseContext {
  init() {
    this.modelName = this._getModelName();
    if (!this.modelName) {
      throw new ValidationError('No schema name');
    }
    this.model = mongoose.model(this.modelName);
    if (!this.model) {
      throw new ValidationError('Invalid model name');
    }
    this.urlParts = getUrlParts(this.req);
    this.appModel = this._getAppModel();
    this.mongoParams = this._getMongoParams();
    return this;
  }

  _getMongoParams() {
    let conditions = {};
    const projections = {};
    let sort = {};
    const urlPartsLen = this.urlParts.length;
    if (urlPartsLen >= 2) {
      const itemId = this.urlParts[urlPartsLen - 1];
      if (!ObjectID.isValid(itemId)) {
        return { err: `Invalid id: ${itemId}` };
      }
      conditions._id = new ObjectID(itemId);
    }

    const { start, order, visible_columns: visibleColumns, columns, length, q } = this.req.query;
    const limit = getLimit(this.appLib, this.appModel, length, this.userPermissions);
    const skip = start ? parseInt(start, 10) : 0;

    if (order && (visibleColumns || columns)) {
      // supporting sorting in datatables format
      // it's not quite right way singe maps are not ordered, but this is the best we can do based on just order and visible_columns
      let shownColumns;
      if (visibleColumns) {
        shownColumns = _(visibleColumns)
          .map((v, k) => (v === 'true' ? k : null))
          .compact()
          .value();
      } else {
        // using req.query.columns, format used by angular datatables
        shownColumns = _.map(columns, 'data');
      }
      if (Array.isArray(order)) {
        _.forEach(order, val => {
          if (val.column) {
            sort[shownColumns[val.column]] = val.dir === 'asc' ? 1 : -1;
          } else {
            return Promise.resolve({
              err: 'Incorrect order format (should be an array in datatables format)',
            });
          }
        });
      } else {
        return Promise.resolve({ err: 'Incorrect order format (should be an array)' });
      }
    } else {
      const { defaultSortBy } = this.appLib.appModel.metaschema;
      sort = _.get(this.appModel, `defaultSortBy`, defaultSortBy.default);
    }
    const searchConditions = [];
    const searchValue = _.get(this.req, 'query.search.value');
    if (searchValue || q) {
      // search[value] (or q) is supported with or without datatables, just in case
      const searchableFields = this._getSearchableFields(this.modelName);
      updateSearchConditions(searchConditions, searchableFields, searchValue || q);
    }

    conditions = MONGO.and(conditions, MONGO.or(...searchConditions));

    // Set all the fields projections to handle 'validate', 'transform' and 'synthesize' stages
    // Using model.schema.tree rather than this.model.schema.paths since 'AssociativeArray' type creates paths like 'assocArray.$*' of instance SingleNestedPath which breaks mongo query (along with 'assocArray' path).
    for (const path of _.keys(this.model.schema.tree)) {
      projections[path] = 1;
    }

    return {
      conditions,
      projections,
      sort,
      limit,
      skip,
    };
  }

  _getModelName() {
    const urlParts = getUrlParts(this.req);
    return _.get(urlParts, 0);
  }

  _getAppModel() {
    const modelName = this._getModelName();
    return _.get(this.appLib.appModel, `models.${modelName}`);
  }
};
