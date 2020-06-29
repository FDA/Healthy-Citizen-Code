const _ = require('lodash');
const RJSON = require('relaxed-json');
const { MONGO, updateSearchConditions } = require('../../util/util');
const GraphQlContext = require('./GraphQlContext');

module.exports = class LookupContext extends GraphQlContext {
  constructor(appLib, req, tableSpec, modelName, args) {
    super(appLib, req, modelName, args);
    this.tableSpec = tableSpec;
    if (_.get(args, 'filter.form')) {
      this.inlineContext.form = args.filter.form;
    }
  }

  async init() {
    this.filteringCondition = await this._getFilteringCondition();
    this.mongoParams = this._getLookupMongoParams();
    return this;
  }

  _getFilteringCondition() {
    const { where, prepare } = this.tableSpec;
    if (!where || _.isEmpty(this.inlineContext.form)) {
      return {};
    }
    return this.appLib.accessUtil.getWhereConditionPromise(where, prepare, this.inlineContext);
  }

  _getLookupMongoParams() {
    const { table } = this.tableSpec;
    const { sort, filter, perPage, page } = this.args;
    const { limit, limitPlusOne, skip } = this._getLimitSkipForPagination(perPage, page);

    const lookupFields = this._getSearchableFields(table);

    const searchConditions = [];

    if (filter.dxQuery) {
      const { conditions: dxQueryConditions } = this.appLib.filterParser.parse(filter.dxQuery, this.appModel);
      searchConditions.push(dxQueryConditions);
    } else if (filter.q) {
      const term = _.get(filter, 'q');
      updateSearchConditions(searchConditions, lookupFields, term);
    }

    const overallSearchCondition = searchConditions.length > 0 ? MONGO.or(...searchConditions) : {};
    const conditions = MONGO.and(overallSearchCondition, this.filteringCondition);

    return {
      conditions,
      sort: sort ? RJSON.parse(sort) : this.tableSpec.sortBy,
      perPage: limit,
      limit: limitPlusOne,
      skip,
    };
  }
};
