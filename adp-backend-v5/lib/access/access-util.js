const _ = require('lodash');
const mem = require('mem');
const LRUCache = require('lru-cache');
const axios = require('axios');
const log = require('log4js').getLogger('lib/access-util');
const Promise = require('bluebird');
const { default: sift } = require('sift');
const { getDefaultArgsAndValuesForInlineCode, MONGO } = require('../util/util');
const { getFunction } = require('../util/memoize');
const { ValidationError } = require('../errors');

module.exports = (appLib) => {
  const m = {};
  const appPermissions = appLib.accessCfg.PERMISSIONS;
  const deviceTypeToPermissions = {
    desktop: [appPermissions.accessFromDesktop],
    tv: [appPermissions.accessFromTv],
    tablet: [appPermissions.accessFromTablet],
    phone: [appPermissions.accessFromPhone],
    bot: [appPermissions.accessFromBot],
    car: [appPermissions.accessFromCar],
  };
  const hashObject = require('../util/hash').getHashObjectFunction(appLib.config.USE_FARMHASH);

  function getEvaluatedWhereCondition(where, inlineContext) {
    if (_.isBoolean(where)) {
      return where;
    }

    try {
      const { args, values } = getDefaultArgsAndValuesForInlineCode();
      const func = getFunction(args, `return ${where}`);
      return func.apply(inlineContext, values);
    } catch (e) {
      appLib.log.error(`Error occurred while evaluating scopeCondition (${where}), will be resolved as FALSE. ${e}`);
      return false;
    }
  }

  function isArrayConditionPassed(actionPermissions, permissions) {
    // here we check AND condition
    return _.every(actionPermissions, (permissionElem) => {
      if (_.isArray(permissionElem)) {
        // here we check OR condition
        return _.some(permissionElem, (nestedPermission) => permissions.has(nestedPermission));
      }
      if (_.isString(permissionElem)) {
        return permissions.has(permissionElem);
      }
      // log.trace(`Invalid type value for actionSettings ${JSON.stringify(actionSettings)}: ${JSON.stringify(permissionElem)}`);
      return false;
    });
  }

  m.isPermissionGranted = (actionPermissions, permissions) => {
    const hasStringPermission = _.isString(actionPermissions) && permissions.has(actionPermissions);
    const hasArrayPermission = _.isArray(actionPermissions) && isArrayConditionPassed(actionPermissions, permissions);
    return hasStringPermission || hasArrayPermission;
  };

  /**
   * Get context for inline functions.
   * @param req
   * @returns {*}
   */
  m.getInlineContext = (req, projections = ['user', 'session', 'params', 'body']) => ({
    req: _.pick(req, projections),
  });

  /**
   * Retrieves user context by request
   */
  m.getUserContext = (req) => req;

  m.addActionsToDocs = (docs, actionFuncs) => {
    if (_.isEmpty(actionFuncs)) {
      return docs;
    }

    _.each(docs, (doc) => {
      doc._actions = {};
      _.each(actionFuncs, (actionFunc, actionName) => {
        doc._actions[actionName] = actionFunc(doc);
      });
    });
    return docs;
  };

  m.getWhereConditionPromise = async (where, preparationName, inlineContext) => {
    const preparationPromiseFunc = appLib.appModelHelpers.Preparations[preparationName];
    if (!preparationPromiseFunc) {
      return getEvaluatedWhereCondition(where, inlineContext);
    }
    const scopeVars = await preparationPromiseFunc();
    const newInlineContext = _.clone(inlineContext);
    newInlineContext.scopeVars = scopeVars || {};
    return getEvaluatedWhereCondition(where, newInlineContext);
  };

  /**
   * Gets scope conditions from actionsObj for one specified action with explanation.
   * Schema or lookup can be passed here.
   * @param actionPermissions
   * @param actionScopes
   * @param userPermissions
   * @param action to retrieve conditions for
   * @param inlineContext needed for preparation specified in 'prepare' field
   * @param isCheckActionPermissions needed to handle actions for model and skip it for other things
   */
  const getObjScopeMetaForAction = async (
    actionPermissions,
    actionScopes,
    userPermissions,
    action,
    inlineContext,
    isCheckActionPermissions
  ) => {
    const meta = { action };

    if (isCheckActionPermissions) {
      meta.isActionPermissionGranted = m.isPermissionGranted(actionPermissions, userPermissions);
      if (!meta.isActionPermissionGranted) {
        meta.overallConditions = false;
        return meta;
      }
    }

    meta.scopeConditions = {};
    await Promise.map(Object.entries(actionScopes), async ([scopeName, modelScope]) => {
      const scopePermission = _.get(modelScope, `permissions.${action}`);
      const isScopePermissionGranted = m.isPermissionGranted(scopePermission, userPermissions);
      const { where, prepare } = modelScope;
      if (isScopePermissionGranted && where) {
        meta.scopeConditions[scopeName] = await m.getWhereConditionPromise(where, prepare, inlineContext);
      } else {
        meta.scopeConditions[scopeName] = false;
      }
    });
    meta.overallConditions = MONGO.or(...Object.values(meta.scopeConditions));

    return meta;
  };

  m.getObjScopeMetaForAction = mem(getObjScopeMetaForAction, { cacheKey: hashObject });

  /**
   * Multiple handler for getObjScopeMetaForAction. Aggregates all scope conditions for actions.
   * @param actionsObj could be any object with correct format of 'actions' and 'scopes' fields and its entries.
   * Schema or lookup can be passed here.
   * @param userPermissions
   * @param actions
   * @param inlineContext
   * @param isCheckActionPermissions
   */
  m.getObjScopeMetaForActions = async (
    actionsObj,
    userPermissions,
    actions,
    inlineContext,
    isCheckActionPermissions
  ) => {
    const actionScopes = actionsObj.scopes;
    const allActionsMeta = await Promise.map(_.castArray(actions), (action) => {
      const actionPermissions = _.get(actionsObj, `actions.fields[${action}].permissions`);
      return m.getObjScopeMetaForAction(
        actionPermissions,
        actionScopes,
        userPermissions,
        action,
        inlineContext,
        isCheckActionPermissions
      );
    });
    return {
      meta: allActionsMeta,
      overallConditions: MONGO.or(...allActionsMeta.map((meta) => meta.overallConditions)),
    };
  };

  m.getScopeConditionsMeta = async (appModel, userPermissions, inlineContext, actions) => {
    const { enablePermissions } = appLib.getAuthSettings();
    if (actions && enablePermissions) {
      return m.getObjScopeMetaForActions(appModel, userPermissions, actions, inlineContext, true);
    }
    return {
      meta: { enablePermissions },
      overallConditions: true,
    };
  };

  m.setReqUser = (req, user) => {
    req.user = user;
  };

  m.getReqUser = (req) => req.user;

  m.setReqRoles = (req, roles) => {
    req.roles = roles;
  };

  m.getReqRoles = (req) => req.roles;

  m.setReqPermissions = (req, permissions) => {
    req.permissions = permissions;
  };

  m.getReqPermissions = (req) => {
    if (!appLib.getAuthSettings().enablePermissions) {
      return m.getAllAppPermissionsSet();
    }
    return req.permissions || new Set();
  };

  m.setReqAuth = ({ req, user, roles, permissions }) => {
    m.setReqUser(req, user);
    m.setReqRoles(req, roles);
    m.setReqPermissions(req, permissions);
  };

  m.getRolesToPermissions = async () => {
    try {
      const rolesCollectionName = 'roles';
      const rolesActualRecordCondition = appLib.dba.getConditionForActualRecord(rolesCollectionName);
      const roles = await appLib.db.collection(rolesCollectionName).find(rolesActualRecordCondition).toArray();

      const rolesToPermissions = {};
      roles.forEach((role) => {
        rolesToPermissions[role.name] = role.permissions;
      });
      // override permission for superAdmin
      const allAppPermissionsSet = m.getAllAppPermissionsSet();
      const superAdmin = appLib.accessCfg.ROLES.SuperAdmin;
      rolesToPermissions[superAdmin] = Array.from(allAppPermissionsSet);
      return rolesToPermissions;
    } catch (e) {
      log.error(`Error occurred while retrieving roles to permissions: ${e}`);
      throw e;
    }
  };

  /**
   * Get user roles and permissions by user roles and auth settings.
   * @param user
   * @param deviceType - necessary for adding permission based on deviceType
   */
  m.getRolesAndPermissionsForUser = async (user, deviceType) => {
    const userPermissions = getImplicitPermissionsFromAuthSettings();

    const deviceTypePermissions = deviceTypeToPermissions[deviceType] || [];
    for (const permission of deviceTypePermissions) {
      userPermissions.add(permission);
    }

    // gather all user roles
    const allUserRoles = new Set();
    if (user) {
      allUserRoles.add(appLib.accessCfg.ROLES.User);
    } else {
      allUserRoles.add(appLib.accessCfg.ROLES.Guest);
    }
    const dbUserRoleLookups = _.get(user, 'roles', []);
    for (const roleLookup of dbUserRoleLookups) {
      allUserRoles.add(roleLookup.label);
    }

    const rolesToPermissions = await appLib.cache.getUsingCache(
      () => m.getRolesToPermissions(),
      appLib.cache.keys.rolesToPermissions()
    );
    // add permissions for each user role
    for (const role of allUserRoles) {
      const rolePermissions = rolesToPermissions[role] || [];
      for (const rolePermission of rolePermissions) {
        userPermissions.add(rolePermission);
      }
    }
    return { roles: allUserRoles, permissions: userPermissions };

    /**
     * According to 'App-wide Parameters and Changes to Overall App Behavior' https://confluence.conceptant.com/pages/viewpage.action?pageId=1016055
     * Some permissions will be granted based on auth settings
     */
    function getImplicitPermissionsFromAuthSettings() {
      const implicitPermissions = new Set();
      implicitPermissions.add(appPermissions.accessAsAnyone);
      if (appLib.getAuthSettings().enableRegistration === true) {
        implicitPermissions.add(appPermissions.createUserAccounts);
      }
      return implicitPermissions;
    }
  };

  m.getAvailActionsFromScopes = (scopes, permissions) => {
    const scopeActions = new Set();
    _.each(scopes, (scope) => {
      const scopePermissions = scope.permissions;
      if (_.isPlainObject(scopePermissions)) {
        _.each(scopePermissions, (actionPermission, actionName) => {
          if (m.isPermissionGranted(actionPermission, permissions)) {
            scopeActions.add(actionName);
          }
        });
      }
    });
    return scopeActions;
  };

  m.getAvailActionsFromActions = (actions, permissions) => {
    const availableActions = new Set();
    _.each(actions.fields, (actionSettings, actionName) => {
      const actionPermissions = actionSettings.permissions;
      if (m.isPermissionGranted(actionPermissions, permissions)) {
        availableActions.add(actionName);
      }
    });
    return availableActions;
  };

  m.getAllAppPermissionsSet = () => {
    // SuperAdmin has all default permissions + declaredPermissions by user except 'accessForbidden' permission
    const defaultPermissions = Object.values(appPermissions);
    const appPermissionsSet = new Set([...defaultPermissions, ...appLib.declaredPermissionNames]);
    appPermissionsSet.delete('accessForbidden');
    return appPermissionsSet;
  };

  m.getViewConditionsByPermissionsForLookup = async (userPermissions, inlineContext, lookup, mongoConditions) => {
    if (appLib.getAuthSettings().enablePermissions) {
      const actions = ['view'];
      const appModel = appLib.appModel.models[lookup.table];

      const [lookupConditionsMeta, modelConditionsMeta] = await Promise.all([
        m.getObjScopeMetaForActions(lookup, userPermissions, actions, inlineContext, false),
        m.getObjScopeMetaForActions(appModel, userPermissions, actions, inlineContext, true),
      ]);
      const lookupConditions = lookupConditionsMeta.overallConditions;
      const modelConditions = modelConditionsMeta.overallConditions;
      return MONGO.and(mongoConditions, lookupConditions, modelConditions);
    }
    return mongoConditions;
  };

  m.getActionFuncsMeta = async (appModel, userPermissions, inlineContext, actions) => {
    const shownModelActionsNames = _.reduce(
      appModel.actions.fields,
      (res, actionSpec, actionName) => {
        if (actionSpec.showInTable !== false) {
          res.push(actionName);
        }
        return res;
      },
      []
    );

    let chosenActions;
    if (actions === false) {
      chosenActions = [];
    } else if (actions === true) {
      chosenActions = shownModelActionsNames;
    } else {
      chosenActions = shownModelActionsNames.filter((action) => actions.includes(action));
    }

    const actionScopes = appModel.scopes;
    const allChosenActionsMeta = await Promise.map(chosenActions, (modelAction) => {
      const actionPermissions = _.get(appModel, `actions.fields[${modelAction}].permissions`);
      return m.getObjScopeMetaForAction(
        actionPermissions,
        actionScopes,
        userPermissions,
        modelAction,
        inlineContext,
        true
      );
    });

    const actionFuncs = {};
    _.each(allChosenActionsMeta, (meta) => {
      const { overallConditions: condition, action } = meta;
      if (condition === true || condition === false) {
        // simple condition
        actionFuncs[action] = () => condition;
      } else {
        // object condition being evaluated with sift
        actionFuncs[action] = sift(condition);
      }
    });

    return {
      meta: allChosenActionsMeta,
      actionFuncs,
    };
  };

  /**
   * Filters fields of document or array of documents by field permissions.
   * @param appModel - app model of doc
   * @param data - doc or array of docs
   * @param action - action is being executed on data
   * @param userPermissions - set of user permissions
   * @param path - current path to appModel object, which contain field 'fields' (e.g. type: Object)
   * @returns {*}
   */
  m.filterDocFields = (appModel, data, action, userPermissions, path = []) => {
    if (!appLib.getAuthSettings().enablePermissions) {
      return data;
    }

    _.each(appModel.fields, (field, fieldKey) => {
      const fieldPath = path.concat(fieldKey);
      const isArrayField = field.type === 'Array';
      const isObjectField = field.type === 'Object';

      const fieldPermissions = _.get(field, `permissions.${action}`);
      const isPermissionGranted = m.isPermissionGranted(fieldPermissions, userPermissions);

      if (_.isArray(data)) {
        _.each(data, (doc) => filterDoc(doc, isPermissionGranted, fieldPath, field, isObjectField, isArrayField));
      } else {
        filterDoc(data, isPermissionGranted, fieldPath, field, isObjectField, isArrayField);
      }
    });

    return data;

    function filterDoc(doc, isPermissionGranted, fieldPath, field, isObjectField, isArrayField) {
      // clear simple types and whole object/array if there is no permission
      if (!isPermissionGranted) {
        return m.clearField(doc, fieldPath, field);
      }

      // go deep for complex objects for write actions even if there is no permissions
      if (isObjectField) {
        return m.filterDocFields(field, doc, action, userPermissions, fieldPath);
      }

      if (isArrayField) {
        const array = _.get(doc, fieldPath, []);
        for (let i = 0; i < array.length; i++) {
          const elemPath = fieldPath.concat(i);
          m.filterDocFields(field, doc, action, userPermissions, elemPath);
        }
      }
      // do nothing for other types with granted permissions
    }
  };

  /**
   * Clear field
   * @param data
   * @param path
   */
  m.clearField = (data, path) => {
    _.unset(data, path);
  };

  /**
   * Merges 2 docs @{userData} and @{dbDoc} (matches @{appModel}) considering @{userPermissions} for @{action}
   * trying to overwrite @{dbDoc} fields with @{userData} fields if permissions is granted
   * otherwise it keeps dbDoc value.
   * There is a quite complicated logic for Array:
   * - merge is executed with considering '_id' of array elements.
   * - if user wants to remove array elements its enough to have permission on @{action} for the array
   *  even if some of nested elements are restricted for @{action}.
   * Note: this function is intended for 'update' action, but can be used for other actions (this is why params contain @{action})
   * @param appModel
   * @param path
   * @param result
   * @param dbDoc
   * @param userData
   * @param action
   * @param userPermissions
   * @returns {*}
   */
  m.mergeDocs = ({ appModel, path = [], result = {}, dbDoc, userData, action, userPermissions }) => {
    // copy _id from dbDoc only for root level
    if (path.length === 0) {
      result._id = dbDoc._id;
    }

    if (!appLib.getAuthSettings().enablePermissions) {
      return _.merge({}, userData, result);
    }

    _.each(appModel.fields, (field, fieldKey) => {
      const fieldPath = path.concat(fieldKey);

      const fieldPermissions = _.get(field, `permissions.${action}`);
      const isPermissionGranted = m.isPermissionGranted(fieldPermissions, userPermissions);

      const userValue = _.get(userData, fieldPath);
      const dbValue = _.get(dbDoc, fieldPath);

      if (!isPermissionGranted) {
        return setVal(result, fieldPath, dbValue);
      }

      const isPasswordField = field.type === 'Password';
      if (isPasswordField) {
        // do not let user set empty password
        const valueToSet = userValue || dbValue;
        return setVal(result, fieldPath, valueToSet);
      }

      const isArrayField = field.type === 'Array';
      const isObjectField = field.type === 'Object';
      if (!isArrayField && !isObjectField) {
        return setVal(result, fieldPath, userValue);
      }

      if (isObjectField) {
        if (_.isEmpty(userValue) && _.isEmpty(dbValue)) {
          return setVal(result, fieldPath, userValue);
        }

        return m.mergeDocs({
          appModel: field,
          path: fieldPath,
          result,
          dbDoc,
          userData,
          action,
          userPermissions,
        });
      }

      if (isArrayField) {
        // if user value for array is not set it should be written as empty
        const userArrValue = userValue || [];

        // map by object id no matter whether its String or ObjectID instance
        const mappedDbArray = _.map(userArrValue, (userObj) => {
          if (!userObj._id) {
            return {};
          }
          const matchedDbDoc = _.find(dbValue, (doc) => doc._id && userObj._id.toString() === doc._id.toString());
          return matchedDbDoc || {};
        });
        // rewrite mapped array to merge db and user objects 1 to 1
        _.set(dbDoc, fieldPath, mappedDbArray);

        for (let i = 0; i < userArrValue.length; i++) {
          const elemPath = fieldPath.concat(i);
          m.mergeDocs({
            appModel: field,
            path: elemPath,
            result,
            dbDoc,
            userData,
            action,
            userPermissions,
          });
        }
      }
    });

    return result;

    function setVal(res, resPath, val) {
      !_.isUndefined(val) && _.set(res, resPath, val);
    }
  };

  m.mergeDocUsingFieldActions = ({ appModel, path = [], result = {}, dbDoc, userData, action, userPermissions }) => {
    // copy _id from dbDoc only for root level
    if (path.length === 0) {
      result._id = dbDoc._id;
    }

    if (!appLib.getAuthSettings().enablePermissions) {
      return _.merge({}, userData, result);
    }

    _.each(appModel.fields, (field, fieldKey) => {
      const fieldPath = path.concat(fieldKey);

      const fieldPermissions = _.get(field, `permissions.${action}`);
      const isPermissionGranted = m.isPermissionGranted(fieldPermissions, userPermissions);

      const fieldAction = _.get(userData, fieldPath.concat('action'));
      let userValue = _.get(userData, fieldPath.concat('value'));
      const dbValue = _.get(dbDoc, fieldPath);

      if (!isPermissionGranted) {
        return setVal({ result, fieldPath, fieldAction, dbValue, userValue });
      }

      const isPasswordField = field.type === 'Password';
      if (isPasswordField) {
        if (fieldAction === 'delete') {
          throw new ValidationError(`Field action ${fieldAction} is not supported on 'Password' field`);
        }
        // do not let user set empty password
        userValue = userValue || dbValue;
        return setVal({ result, fieldPath, fieldAction, dbValue, userValue });
      }

      const isArrayField = field.type === 'Array';
      const isObjectField = field.type === 'Object';
      if (!isArrayField && !isObjectField) {
        return setVal({ result, fieldPath, fieldAction, dbValue, userValue });
      }

      if (isObjectField) {
        if (_.isEmpty(userValue) && _.isEmpty(dbValue)) {
          return _.set(result, fieldPath, {});
        }

        return m.mergeDocs({
          appModel: field,
          path: fieldPath,
          result,
          dbDoc,
          userData,
          action,
          userPermissions,
        });
      }

      if (isArrayField) {
        // if user value for array is not set it should be written as empty
        const userArrValue = userValue || [];

        // map by object id no matter whether its String or ObjectID instance
        const mappedDbArray = _.map(userArrValue, (userObj) => {
          if (!userObj._id) {
            return {};
          }
          const matchedDbDoc = _.find(dbValue, (doc) => doc._id && userObj._id.toString() === doc._id.toString());
          return matchedDbDoc || {};
        });
        // rewrite mapped array to merge db and user objects 1 to 1
        _.set(dbDoc, fieldPath, mappedDbArray);

        for (let i = 0; i < userArrValue.length; i++) {
          const elemPath = fieldPath.concat(i);
          m.mergeDocs({
            appModel: field,
            path: elemPath,
            result,
            dbDoc,
            userData,
            action,
            userPermissions,
          });
        }
      }
    });

    return result;

    // eslint-disable-next-line no-shadow
    function setVal({ result, fieldPath, fieldAction, dbValue, userValue }) {
      if (_.isUndefined(fieldAction) || fieldAction === 'doNotChange') {
        return _.set(result, fieldPath, dbValue);
      }

      if (fieldAction === 'delete') {
        return _.unset(result, fieldPath);
      }
      if (fieldAction === 'update') {
        !_.isUndefined(userValue) && _.set(result, fieldPath, userValue);
        return;
      }

      throw new ValidationError(`Unknown field action found: ${fieldAction}`);
    }
  };

  function getFieldVerbByAction(action) {
    if (action === 'view') {
      return 'read';
    }
    if (action === 'create' || action === 'update') {
      return 'write';
    }
    return null;
  }

  m.getModelFieldsInfo = (appModel, actions, userPermissions, path = [], filteringInfo = {}) => {
    _.each(appModel.fields, (field, fieldKey) => {
      if (!field.visible || !field.permissions) {
        return;
      }
      _.each(actions, (action) => {
        const newPath = path.concat(fieldKey);
        const fieldPermissions = _.get(field, `permissions.${action}`);
        const actionToSend = getFieldVerbByAction(action);
        const isPermissionGranted = m.isPermissionGranted(fieldPermissions, userPermissions);
        if (actionToSend) {
          const pathWithDots = newPath.join('.');
          if (!filteringInfo[pathWithDots]) {
            filteringInfo[pathWithDots] = { [actionToSend]: isPermissionGranted };
          } else {
            filteringInfo[pathWithDots][actionToSend] = isPermissionGranted;
          }
        }
        // go deeper only if parent field permissions is granted
        if (isPermissionGranted && field.fields) {
          m.getModelFieldsInfo(field, action, userPermissions, newPath, filteringInfo);
        }
      });
    });

    return filteringInfo;
  };

  m.getListValues = async (list, dynamicListRequestConfig) => {
    if (list.isDynamicList) {
      const { name: endpoint } = list;
      const response = await axios.get(endpoint, dynamicListRequestConfig);
      return response.data.data || {};
    }

    const { name: listName, values: builtInList } = list;
    const listValue = appLib.appModelHelpers.Lists[listName];
    if (_.isFunction(listValue)) {
      return listValue();
    }
    return listValue || builtInList;
  };

  m.getListForUser = async (
    userPermissions,
    inlineContext,
    listPath,
    requestDynamicList = false,
    dynamicListRequestConfig,
    action = 'view'
  ) => {
    const listFieldScheme = _.get(appLib.appModel.models, listPath);
    if (!listFieldScheme) {
      return null;
    }

    const { type: fieldType, required: elemRequired, list } = listFieldScheme;
    const required = elemRequired === true || elemRequired === 'true';

    if (!requestDynamicList && list.isDynamicList && (fieldType === 'List' || fieldType === 'List[]')) {
      // Do not request dynamic list values for /app-model, since the client will always request most recent list data
      return { type: fieldType, required, dynamicList: { name: list.name, params: list.params } };
    }

    let listValues;
    try {
      listValues = await m.getListValues(list, dynamicListRequestConfig);
    } catch (e) {
      log.error(`Unable to get list values for '${listPath}', list name: '${list.name}'`);
      listValues = {};
    }

    const isPermissionsEnabled = appLib.getAuthSettings().enablePermissions;
    if (!isPermissionsEnabled) {
      return {
        type: fieldType,
        required,
        values: listValues,
      };
    }

    // here we collect lists available for each scope for current listPath
    // then merge these lists into one result list
    const listsForScopes = [];
    const { args, values } = getDefaultArgsAndValuesForInlineCode();
    const listScopes = list.scopes;
    _.each(listScopes, (listScope, listScopeName) => {
      const scopePermission = _.get(listScope, `permissions.${action}`);
      const isScopePermissionGranted = m.isPermissionGranted(scopePermission, userPermissions);

      if (!isScopePermissionGranted || listScope.where === false) {
        return;
      }

      const whereList = {};
      if (listScope.where === true) {
        _.each(listValues, (val, key) => {
          whereList[key] = val;
        });
      } else {
        const whereFunc = getFunction(`val, key, ${args}`, listScope.where);
        _.each(listValues, (val, key) => {
          try {
            const isWherePassed = whereFunc.apply(inlineContext, [val, key, ...values]);
            if (isWherePassed === true) {
              whereList[key] = val;
            }
          } catch (e) {
            appLib.log.error(
              `Error occurred while calculating where condition for listPath='${listPath}'. ` +
                `Element: val='${val}', key='${key}'. ` +
                `This element will not be included in result list for scope '${listScopeName}'.\n`,
              e.stack
            );
          }
        });
      }

      let returnedListForScope;
      try {
        const formListFunc = getFunction(`$list, ${args}`, listScope.return);
        returnedListForScope = formListFunc.apply(inlineContext, [whereList, ...values]);
      } catch (e) {
        returnedListForScope = {};
        appLib.log.error(
          `Error occurred during list generation for scope ${listScope} for path ${listPath}. ` +
            `Applied empty object for this list.\n`,
          e
        );
      }

      listsForScopes.push(returnedListForScope);
    });

    const mergedListForScopes = listsForScopes.reduce((result, current) => _.merge(result, current), {});

    return {
      type: fieldType,
      required,
      values: mergedListForScopes,
    };
  };

  /**
   *
   * @param userPermissions - Set of permissions
   * @param inlineContext - used as argument in generated 'where' and 'return' functions
   * @param listPathsToGet
   */
  m.getListsForUser = async (userPermissions, inlineContext, listPathsToGet) => {
    const allListsForUser = {};

    await Promise.map(listPathsToGet, async (listPath) => {
      const list = await m.getListForUser(userPermissions, inlineContext, listPath);
      allListsForUser[listPath] = list;
    });

    return allListsForUser;
  };

  m.getMenuForUser = (userPermissions, appModelForUser) => {
    const menu = { mainMenu: appModelForUser.interface.mainMenu };

    cleanMenuPart(menu, 'mainMenu', userPermissions);

    return menu.mainMenu;

    /**
     * @param parentMenu Parent menu obj from which processed menu will be cleaned up
     * @param path Menu path of processed menu
     * @param permissions
     */
    function cleanMenuPart(parentMenu, path, permissions) {
      const curMenu = parentMenu[path];
      if (!_.isPlainObject(curMenu)) {
        return;
      }

      const { scopes } = curMenu;

      let actionsFromScopes;
      if (!scopes) {
        // allow all pages if there is no scopes field
        actionsFromScopes = new Set(['view']);
      } else {
        actionsFromScopes = m.getAvailActionsFromScopes(scopes, permissions);
      }

      // delete menu from parent obj or clean up scopes and go deeper
      if (!actionsFromScopes.has('view')) {
        _.unset(parentMenu, path);
      } else {
        _.unset(parentMenu, `${path}.scopes`);

        _.each(curMenu.fields, (obj, nestedPath) => {
          cleanMenuPart(curMenu.fields, nestedPath, permissions);
        });
      }
    }
  };

  m.getPagesForUser = (userPermissions, appModelForUser) => {
    const pages = _.get(appModelForUser, 'interface.pages');
    _.each(pages, (page, pageName) => {
      const scopes = _.get(page, 'scopes');
      let actionsFromScopes;
      if (!scopes) {
        // allow all pages if there is no scopes field
        actionsFromScopes = new Set(['view']);
      } else {
        actionsFromScopes = m.getAvailActionsFromScopes(scopes, userPermissions);
      }

      if (!actionsFromScopes.has('view')) {
        delete pages[pageName];
      } else {
        delete pages[pageName].scopes;
      }
    });

    return pages;
  };

  m.validateAndTransformListsValues = async (modelName, data, userPermissions, inlineContext) => {
    const listsErrors = [];
    const fieldsPathInAppModel = `${modelName}.fields.`;

    const schemaListsFields = appLib.ListsFields.filter((path) => path.startsWith(fieldsPathInAppModel));
    const allowedLists = await m.getListsForUser(userPermissions, inlineContext, schemaListsFields);

    await Promise.map(Object.entries(allowedLists), ([listFieldFullPath, list]) => {
      const fieldPath = listFieldFullPath.slice(fieldsPathInAppModel.length).split('.fields.').join('.');
      return validate(data, list, fieldPath);
    });
    return listsErrors;

    async function validate(_data, list, fieldPath) {
      if (list.dynamicList) {
        // Dynamic values of type 'List' might differ depending on 'dynamicListRequestConfig' sent from client (see accessUtil.getListForUser)
        // For now validation for this case is disabled.
        return;
      }

      const userVal = _.get(_data, fieldPath);
      if (_.isEmpty(userVal)) {
        return;
      }

      const listValues = list.values;
      const isArrayType = list.type.endsWith('[]');
      if (isArrayType) {
        if (!_.isArray(userVal)) {
          listsErrors.push(`Value '${userVal}' should be an array for '${fieldPath}'.`);
        } else {
          _.remove(userVal, (val) => !listValues[val]);
        }
      } else if (userVal && !listValues[userVal]) {
        listsErrors.push(`Value '${userVal}' is not allowed for list field '${fieldPath}'.`);
      }
    }
  };

  m.removePermissionsFromObjFields = (obj) => {
    _.each(obj.fields, (field, fieldKey) => {
      _.unset(obj, ['fields', fieldKey, 'permissions']);
      if (field.fields) {
        m.removePermissionsFromObjFields(field);
      }
    });
  };

  m.injectFieldsInfo = (model, actions, userPermissions) => {
    _.each(model.fields, (field) => {
      if (!field.permissions || !appLib.getAuthSettings().enablePermissions) {
        field.fieldInfo = { read: true, write: true };
        // go deeper for parent field permissions
        if (field.fields) {
          m.injectFieldsInfo(field, actions, userPermissions);
        }
        return;
      }
      _.each(actions, (action) => {
        const fieldPermissions = _.get(field, `permissions.${action}`);
        const isPermissionGranted = m.isPermissionGranted(fieldPermissions, userPermissions);
        const fieldVerb = getFieldVerbByAction(action);
        if (fieldVerb) {
          _.set(field, `fieldInfo.${fieldVerb}`, isPermissionGranted);
        }
        // go deeper only if parent field permissions is granted
        if (isPermissionGranted && field.fields) {
          m.injectFieldsInfo(field, actions, userPermissions);
        }
      });
    });
  };

  m.getBaseAppModel = () => {
    const baseAppModel = _.cloneDeep(appLib.appModel);
    for (const modelName of appLib.datasetModelNames.entries()) {
      delete baseAppModel.models[modelName];
    }

    _.each(baseAppModel.models, (model) => {
      delete model.limitReturnedRecords;
      delete model.indexes;
      delete model.softDelete;
    });

    const app = _.get(baseAppModel, 'interface.app');
    if (app) {
      delete app.permissions;
      delete app.preStart;
    }
    delete baseAppModel.rolesToPermissions;
    delete baseAppModel.usedPermissions;
    delete baseAppModel.typeDefaults;
    delete baseAppModel.subtypeDefaults;
    delete baseAppModel.validatorShortcuts;
    delete baseAppModel.macros;

    m.removeBaseAppModelParts(baseAppModel.models);

    return baseAppModel;
  };

  m.removeBaseAppModelParts = (parts, path = []) => {
    _.each(parts, (val, key) => {
      m.removeBaseAppModelPart(val, _.concat(path, key));
    });
  };

  m.removeBaseAppModelPart = (part, path = []) => {
    if (part.synthesize) {
      part.showInForm = false;
    }
    if (part.synthesize && part.formRender) {
      part.showInForm = true;
    }

    delete part.generatorSpecification;
    delete part.synthesize;
    delete part.transform;
    delete part.softDelete;
    delete part.indexes;

    if (['LookupObjectID', 'LookupObjectID[]'].includes(part.type)) {
      return _.each(part.lookup.table, (lookupSpec) => {
        delete lookupSpec.foreignKeyType;
        delete lookupSpec.scopes;
        delete lookupSpec.sortBy;
        delete lookupSpec.sourceTable;
      });
    }

    if (part.type === 'TreeSelector') {
      return _.each(part.table, (treeSelectorSpec) => {
        delete treeSelectorSpec.foreignKeyType;
        delete treeSelectorSpec.scopes;
        delete treeSelectorSpec.sortBy;
        delete treeSelectorSpec.sourceTable;
        delete treeSelectorSpec.leaves;
        delete treeSelectorSpec.roots;
      });
    }

    if (part.fields) {
      m.removeBaseAppModelParts(part.fields, _.concat(path, 'fields'));
    }
  };

  m.handleModelByPermissions = (model, userPermissions) => {
    // actions for read and write
    const actions = ['view', 'update'];
    m.injectFieldsInfo(model, actions, userPermissions);
    m.removePermissionsFromObjFields(model);

    const actionsFromScopes = m.getAvailActionsFromScopes(model.scopes, userPermissions);
    const actionsFromActions = m.getAvailActionsFromActions(model.actions, userPermissions);
    const intersectedActions = new Set([...actionsFromActions].filter((a) => actionsFromScopes.has(a)));

    // delete scopes and permission details
    delete model.scopes;
    _.each(model.actions.fields, (actionSettings, actionName) => {
      if (appLib.allActionsNames.includes(actionName) && !intersectedActions.has(actionName)) {
        delete model.actions.fields[actionName];
      } else {
        delete model.actions.fields[actionName].permissions;
      }
    });
  };

  /**
   * Replace every list/dynamicList field contains 'scopes' and 'values' with plain list values
   * @param userPermissions
   * @param inlineContext
   * @param models
   * @returns {Promise<void>}
   */
  m.injectListValues = async (userPermissions, inlineContext, models) => {
    const lists = await m.getListsForUser(userPermissions, inlineContext, appLib.ListsFields);
    _.each(lists, (list, listFieldPath) => {
      _.set(models, `${listFieldPath}.list`, list.values);
      _.set(models, `${listFieldPath}.dynamicList`, list.dynamicList);
    });
  };

  m.injectListValuesForModel = async (userPermissions, inlineContext, model) => {
    const modelName = model.schemaName;
    const listFields = appLib.ListsFields.filter((f) => f.startsWith(modelName));
    const lists = await m.getListsForUser(userPermissions, inlineContext, listFields);
    _.each(lists, (list, fieldPathWithModel) => {
      const fieldPath = fieldPathWithModel.replace(`${modelName}.`, '');
      const field = _.get(model, fieldPath);
      if (field) {
        // checking field since for datasets schemes there may be reduced set of fields included
        field.list = list.values;
      }
    });
  };

  const getAuthorizedAppModel = mem(
    async (userPermissions, inlineContext, deviceType) => {
      // appLib.baseAppModel is static since app start, this is why it's not an argument
      const authorizedModel = _.cloneDeep(appLib.baseAppModel);
      _.each(authorizedModel.models, (model) => {
        m.handleModelByPermissions(model, userPermissions);
      });

      if (userPermissions.has('accessRolesAndPermissions')) {
        _.set(authorizedModel, 'interface.app.permissions', _.get(appLib.appModel, 'interface.app.permissions'));
      }

      await m.injectListValues(userPermissions, inlineContext, authorizedModel.models);
      authorizedModel.interface.mainMenu = m.getMenuForUser(userPermissions, authorizedModel);
      authorizedModel.interface.pages = m.getPagesForUser(userPermissions, authorizedModel);
      _.set(authorizedModel, 'interface.app.deviceType', deviceType);

      return authorizedModel;
    },
    { cacheKey: hashObject, cache: new LRUCache({ max: 1000 }) }
  );

  async function getUserSettings(userContext) {
    const userId = _.get(userContext, 'user._id');
    if (!userId) {
      return {};
    }
    const [settings = {}] = await appLib.dba.getItemsUsingCache({
      modelName: '_userSettings',
      userContext,
      mongoParams: { conditions: { 'creator._id': userId } },
    });
    return settings;
  }

  const applyThemeRules = (record) => {
    if (record.fixedHeader === false) {
      record.fixedRibbon = false;
      record.fixedNavigation = false;
    }

    if (record.fixedNavigation) {
      record.fixedWidth = false;
      record.fixedHeader = true;
    } else if (record.fixedNavigation === false) {
      record.fixedRibbon = false;
    }

    if (record.fixedRibbon) {
      record.fixedHeader = true;
      record.fixedNavigation = true;
      record.fixedWidth = false;
    }

    if (record.fixedWidth) {
      record.fixedNavigation = false;
      record.fixedRibbon = false;
    }

    return record;
  };

  m.getUserSettingsMergedWithDefaults = (settings = {}, returnAsInterface = true) => {
    const recordPathToInterfacePath = {
      skin: 'skin',
      menuPosition: 'layout.menuPosition',
      fullScreenToggle: 'app.header.components.fullScreenToggle',
      headerVisible: 'app.header.visible',
      footerVisible: 'app.footer.visible',
      fixedHeader: 'layout.fixed.header',
      fixedNavigation: 'layout.fixed.navigation',
      fixedFooter: 'layout.fixed.footer',
      fixedWidth: 'layout.fixedWidth',
    };

    const resultSettings = {};
    _.each(recordPathToInterfacePath, (interfacePath, recordPath) => {
      const resultPath = returnAsInterface ? interfacePath : recordPath;
      const recordValue = settings[recordPath];

      if (!_.isUndefined(recordValue)) {
        return _.set(resultSettings, resultPath, recordValue);
      }
      const interfaceValue = _.get(appLib.appModel.interface, interfacePath);
      _.set(resultSettings, resultPath, interfaceValue);
    });

    return applyThemeRules(resultSettings);
  };

  async function getThemeSettingsForAppModel(userContext) {
    const settings = await getUserSettings(userContext);
    return m.getUserSettingsMergedWithDefaults(settings);
  }

  m.getAuthorizedAppModel = async (req) => {
    const userPermissions = m.getReqPermissions(req);
    const userContext = m.getUserContext(req);
    const inlineContext = m.getInlineContext(req);
    const deviceType = req.device.type;

    const [model, themeSettings] = await Promise.all([
      getAuthorizedAppModel(userPermissions, inlineContext, deviceType),
      getThemeSettingsForAppModel(userContext),
    ]);
    _.merge(model.interface, themeSettings);

    return model;
  };

  const getUnauthorizedAppModel = mem(
    (userPermissions, deviceType) => {
      // appLib.baseAppModel is static since app start, this is why it's not an argument
      const unauthorizedModel = _.cloneDeep(appLib.baseAppModel);
      // actions for read and write
      const actions = ['view', 'update'];
      const { models } = unauthorizedModel;
      unauthorizedModel.models = { users: models.users };
      _.each(unauthorizedModel.models, (model) => {
        m.injectFieldsInfo(model, actions, userPermissions);
      });

      const menuFields = unauthorizedModel.interface.mainMenu.fields;
      unauthorizedModel.interface.mainMenu.fields = { home: menuFields.home };
      const { pages } = unauthorizedModel.interface;
      unauthorizedModel.interface.pages = { home: pages.home };
      _.set(unauthorizedModel, 'interface.app.deviceType', deviceType);

      return unauthorizedModel;
    },
    { cacheKey: hashObject }
  );

  m.getUnauthorizedAppModel = (req) => {
    const userPermissions = m.getReqPermissions(req);
    const deviceType = req.device.type;

    return getUnauthorizedAppModel(userPermissions, deviceType);
  };

  m.getAdminLookupScopeForViewAction = () => ({
    superAdminScope: {
      permissions: {
        view: appPermissions.accessAsSuperAdmin,
      },
      where: true,
    },
  });

  m.getAnyoneListScope = () => {
    const permissions = {};
    _.each(appLib.accessCfg.DEFAULT_ACTIONS, (action) => {
      permissions[action] = appPermissions.accessAsAnyone;
    });

    return {
      anyoneScope: {
        permissions,
        where: true,
        return: 'return $list',
      },
    };
  };

  m.getAdminListScope = () => {
    const permissions = {};
    _.each(appLib.accessCfg.DEFAULT_ACTIONS, (action) => {
      permissions[action] = appPermissions.accessAsSuperAdmin;
    });

    return {
      superAdminScope: {
        permissions,
        where: true,
        return: 'return $list',
      },
    };
  };

  m.getFieldActionByModelAction = (action) => {
    if (action === 'view') {
      return 'read';
    }
    if (action === 'create' || action === 'update') {
      return 'write';
    }
    return null;
  };

  m.setAvailablePermissions = () => {
    appLib.declaredPermissions = _.get(appLib, 'appModel.interface.app.permissions', {});
    // save declaredPermissionNames for future granting permissions to SuperAdmin
    appLib.declaredPermissionNames = _.keys(appLib.declaredPermissions);
    const defaultPermissionsNames = _.keys(appPermissions);

    // Inject availablePermissions to Lists to use it in roles schema
    // Available permissions are declared permissions except system permissions
    const availablePermissions = _.reduce(
      appLib.declaredPermissionNames,
      (result, permName) => {
        if (!defaultPermissionsNames.includes(permName)) {
          result[permName] = permName;
        }
        return result;
      },
      {}
    );
    _.set(appLib, 'appModelHelpers.Lists.availablePermissions', availablePermissions);
  };

  return m;
};
