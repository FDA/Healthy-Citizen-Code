const GraphQlContext = require('./GraphQlContext');

module.exports = class FilterContext extends GraphQlContext {
  init() {
    const { sort = {}, filter, perPage, page } = this.args;
    const { limit, limitPlusOne, skip } = this._getLimitSkipForPagination(perPage, page);
    this.mongoParams = {
      conditions: filter,
      sort: this._getSort(sort),
      perPage: limit,
      limit: limitPlusOne,
      skip,
    };

    return this;
  }
};
