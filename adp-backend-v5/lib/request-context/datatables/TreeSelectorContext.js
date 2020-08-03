const _ = require('lodash');
const { getUrlParts, getUrlWithoutPrefix } = require('../../util/util');
const LookupContext = require('./LookupContext');
const ValidationError = require('../../errors/validation-error');

module.exports = class TreeSelectorContext extends LookupContext {
  constructor(appLib, req) {
    super(appLib, req);
    this.foreignKeyVal = req.query.foreignKeyVal;
  }

  _getTableSpec() {
    const urlParts = getUrlParts(getUrlWithoutPrefix(this.req.url, this.appLib.API_PREFIX));
    const [treeSelectorId, tableName] = urlParts.slice(-2);
    if (!treeSelectorId) {
      throw new ValidationError(`No TreeSelector ID in the URL: ${this.req.url}`);
    }
    const treeselectorSpec = _.get(this.appLib.appTreeSelectors, treeSelectorId);
    const tableSpec = _.clone(_.get(treeselectorSpec, tableName));
    if (!tableSpec) {
      throw new ValidationError(`Invalid path to TreeSelector in the URL: ${this.req.url}`);
    }
    return tableSpec;
  }
};
