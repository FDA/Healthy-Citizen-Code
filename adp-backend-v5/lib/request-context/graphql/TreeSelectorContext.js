const _ = require('lodash');
const LookupContext = require('./LookupContext');

module.exports = class TreeSelectorContext extends LookupContext {
  constructor(appLib, req, tableSpec, modelName, args) {
    super(appLib, req, tableSpec, modelName, args);
    this.foreignKeyVal = _.get(this.args, 'filter.foreignKeyVal');
  }
};
