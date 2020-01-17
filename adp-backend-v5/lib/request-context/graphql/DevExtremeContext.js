const RJSON = require('relaxed-json');
const GraphQlContext = require('./GraphQlContext');

module.exports = class DevExtremeContext extends GraphQlContext {
  init() {
    const { sort = {}, filter, perPage, page } = this.args;
    const { limit, limitPlusOne, skip } = this._getLimitSkipForPagination(perPage, page);
    const {
      filterParser: { parse },
    } = this.appLib;
    this.mongoParams = {
      conditions: parse(filter.dxQuery, this.appModel),
      sort: RJSON.parse(sort),
      perPage: limit,
      limit: limitPlusOne,
      skip,
    };

    return this;
  }
};
