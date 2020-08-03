const log = require('log4js').getLogger('list-controller');
const queryString = require('query-string');

module.exports = () => {
  const m = {};

  m.init = async (appLib) => {
    m.appLib = appLib;
    appLib.addRoute('get', `/getList`, [appLib.isAuthenticated, m.getList]);
  };

  m.getList = async (req, res) => {
    try {
      const { getInlineContext, getReqPermissions, getListForUser } = m.appLib.accessUtil;
      const inlineContext = getInlineContext(req);
      const userPermissions = getReqPermissions(req);

      const { listFieldPath, listParams, action } = req.query;
      if (!listFieldPath) {
        return res.json({
          success: false,
          data: null,
          message: `Query param 'listFieldPath' must be presented`,
        });
      }

      const fullListPath = listFieldPath.includes('.fields.')
        ? listFieldPath
        : listFieldPath.split('.').join('.fields.');

      const requestDynamicList = true;
      const dynamicListRequestConfig = { params: queryString.parse(listParams) };
      const list = await getListForUser(
        userPermissions,
        inlineContext,
        fullListPath,
        requestDynamicList,
        dynamicListRequestConfig,
        action
      );
      if (!list) {
        return res.json({ success: false, data: null });
      }
      return res.json({ success: true, data: list.values });
    } catch (e) {
      log.error(e.stack);
      return res.json({ success: false, data: null, message: `Unable to get list.` });
    }
  };

  return m;
};
