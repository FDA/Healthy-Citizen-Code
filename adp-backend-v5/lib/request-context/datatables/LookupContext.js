const _ = require('lodash');
const { getUrlParts, getUrlWithoutPrefix, MONGO, updateSearchConditions } = require('../../util/util');
const { getLimit, getSkip } = require('../util');
const BaseContext = require('../BaseContext');
const ValidationError = require('../../errors/validation-error');

module.exports = class LookupContext extends BaseContext {
  async init() {
    if (this.req.body) {
      this.inlineContext.form = this.req.body;
    }
    this.tableSpec = this._getTableSpec();
    if (!this.appLib.appModel.models[this.tableSpec.table]) {
      throw new ValidationError(`Invalid model name in the URL: ${this.req.url}`);
    }
    this.modelName = this.tableSpec.table;
    this.filteringCondition = await this._getFilteringCondition();
    this.mongoParams = this._getLookupMongoParams();
    return this;
  }

  _getTableSpec() {
    const urlParts = getUrlParts(getUrlWithoutPrefix(this.req.url, this.appLib.API_PREFIX));
    const [lookupId, tableName] = urlParts.slice(-2);
    if (!lookupId) {
      throw new ValidationError(`No lookup ID in the URL: ${this.req.url}`);
    }
    const lookup = _.get(this.appLib.appLookups, lookupId);
    const schemeLookup = _.clone(_.get(lookup, ['table', tableName]));
    if (!schemeLookup) {
      throw new ValidationError(`Invalid path to lookup in the URL: ${this.req.url}`);
    }
    return schemeLookup;
  }

  async _getFilteringCondition() {
    const { where, prepare } = this.tableSpec;
    if (!where || _.isEmpty(this.inlineContext.form)) {
      return {};
    }
    return this.appLib.accessUtil.getWhereConditionPromise(where, prepare, this.inlineContext);
  }

  _getLookupMongoParams() {
    // TODO: should I move limit to lookup definition? Or give one ability to override, make it smaller than the one defined on table?
    const lookupAppModel = _.get(this.appLib.appModel.models, this.tableSpec.table);
    const limit = getLimit(this.appLib, lookupAppModel, Number.Infinity, this.userPermissions);
    const { page, q } = this.req.query;
    const skip = getSkip(page, limit);

    const searchConditions = [];
    const lookupFields = this._getSearchableFields(this.tableSpec.table);
    updateSearchConditions(searchConditions, lookupFields, q);
    const overallSearchCondition = searchConditions.length > 0 ? MONGO.or(...searchConditions) : {};
    const conditions = MONGO.and(overallSearchCondition, this.filteringCondition);
    return {
      conditions,
      sort: this.tableSpec.sortBy,
      limit,
      skip,
    };
  }
};
