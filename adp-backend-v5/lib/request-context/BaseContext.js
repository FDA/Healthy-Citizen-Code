const _ = require('lodash');

module.exports = class BaseContext {
  constructor(appLib, req) {
    this.appLib = appLib;
    this.req = req;

    this.user = appLib.accessUtil.getReqUser(req);
    this.userPermissions = appLib.accessUtil.getReqPermissions(req);
    this.roles = appLib.accessUtil.getReqRoles(req);
    this.inlineContext = appLib.accessUtil.getInlineContext(req);
    this.userContext = appLib.accessUtil.getUserContext(req);
  }

  /**
   * Utility method returning all searchable fields in a given collection based on appModel definition
   * TODO: extract utility method like this one into a separate file?
   * @param tableName the name of the table to find searchable fields in
   */
  _getSearchableFields(tableName) {
    return _(this.appLib.appModel.models[tableName].fields)
      .map((val, key) => (val.searchable ? key : false))
      .compact()
      .value();
  }
};
