const _ = require('lodash');
const { getUrlParts } = require('../../util/util');
const LookupContext = require('./LookupContext');
const ValidationError = require('../../errors/validation-error');

module.exports = class TreeSelectorContextContext extends LookupContext {
  constructor(appLib, req) {
    super(appLib, req);
    this.foreignKeyVal = req.query.foreignKeyVal;
  }

  _getTableSpec() {
    const urlParts = getUrlParts(this.req);
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
