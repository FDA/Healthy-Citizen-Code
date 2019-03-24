const _ = require('lodash');
const log = require('log4js').getLogger('lib/access-util');
const Promise = require('bluebird');
const {
  getDefaultArgsAndValuesForInlineCode,
  getModelNameByReq,
  MONGO,
} = require('../backend-util');

module.exports = appLib => {
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

  function getEvaluatedScopeCondition(scopeCondition, prepareContext) {
    try {
      const { args, values } = getDefaultArgsAndValuesForInlineCode();
      const func = new Function(args, `return ${scopeCondition}`);
      return func.apply(prepareContext, values);
    } catch (e) {
      appLib.log.error(
        `Error occurred while evaluating scopeCondition (${scopeCondition}), will be resolved as FALSE. ${e}`
      );
      return MONGO.EXPR.FALSE;
    }
  }

  function isArrayConditionPassed(actionPermissions, permissions) {
    // here we check AND condition
    return _.every(actionPermissions, permissionElem => {
      if (_.isArray(permissionElem)) {
        // here we check OR condition
        return _.some(permissionElem, nestedPermission => permissions.has(nestedPermission));
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
    const hasArrayPermission =
      _.isArray(actionPermissions) && isArrayConditionPassed(actionPermissions, permissions);
    return hasStringPermission || hasArrayPermission;
  };

  /**
   * Get context for inline functions.
   * @param req
   * @returns {*}
   */
  m.getInlineContext = req => ({ req });

  /**
   * Retrieves user context by request
   */
  m.getUserContext = req => req;

  m.getWhereConditionPromise = (where, preparationName, prepareContext) => {
    const preparationPromiseFunc = appLib.appModelHelpers.Preparations[preparationName];
    if (!preparationPromiseFunc) {
      return Promise.resolve(getEvaluatedScopeCondition(where, prepareContext));
    }
    return preparationPromiseFunc().then(scopeVars => {
      const newPrepareContext = _.clone(prepareContext);
      newPrepareContext.scopeVars = scopeVars || {};
      return getEvaluatedScopeCondition(where, newPrepareContext);
    });
  };

  /**
   * Gets scope condition from actionsObj for one specified action.
   * @param actionsObj could be any object with correct format of 'actions' and 'scopes' fields and its entries.
   * Schema or lookup can be passed here.
   * @param userPermissions
   * @param action to retrieve conditions for
   * @param prepareContext needed for preparation specified in 'prepare' field
   * @param isCheckActionPermissions needed to handle actions for model and skip it for other things
   * @returns {Promise<any>}
   */
  m.getObjScopeConditionsForAction = (
    actionsObj,
    userPermissions,
    action,
    prepareContext,
    isCheckActionPermissions
  ) => {
    // TODO: remove sending TRUE for custom actions when migrate to all custom actions
    if (!appLib.accessCfg.DEFAULT_ACTIONS.includes(action)) {
      return Promise.resolve(MONGO.EXPR.TRUE);
    }
    if (isCheckActionPermissions) {
      const actionPermissions = _.get(actionsObj, `actions.fields[${action}].permissions`);
      const isActionPermissionGranted = m.isPermissionGranted(actionPermissions, userPermissions);
      if (!isActionPermissionGranted) {
        return Promise.resolve(MONGO.EXPR.FALSE);
      }
    }

    const scopeConditionsPromises = [];
    _.each(actionsObj.scopes, modelScope => {
      const scopePermission = _.get(modelScope, `permissions.${action}`);
      const isScopePermissionGranted = m.isPermissionGranted(scopePermission, userPermissions);
      const { where, prepare } = modelScope;
      if (isScopePermissionGranted && where) {
        const whereConditionPromise = m.getWhereConditionPromise(where, prepare, prepareContext);
        scopeConditionsPromises.push(whereConditionPromise);
      }
    });
    if (!scopeConditionsPromises.length) {
      return Promise.resolve(MONGO.EXPR.FALSE);
    }
    return Promise.all(scopeConditionsPromises).then(scopeConditions => {
      const filteredConditions = scopeConditions.filter(sc => !_.isEmpty(sc));
      if (filteredConditions.length) {
        return MONGO.or(...filteredConditions);
      }
      return MONGO.or(MONGO.EXPR.FALSE);
    });
  };

  /**
   * Multiple handler for getObjScopeConditionsForAction. Aggregates all scope conditions for actions.
   * @param actionsObj
   * @param userPermissions
   * @param actions
   * @param prepareContext
   * @param isCheckActionPermissions
   */
  m.getObjScopeConditionsForActions = (
    actionsObj,
    userPermissions,
    actions,
    prepareContext,
    isCheckActionPermissions
  ) =>
    Promise.map(actions, action =>
      m
        .getObjScopeConditionsForAction(
          actionsObj,
          userPermissions,
          action,
          prepareContext,
          isCheckActionPermissions
        )
        .then(scopeConditions => MONGO.expr(scopeConditions))
    ).then(
      allActionsConditions =>
        allActionsConditions.length
          ? MONGO.or(...allActionsConditions)
          : MONGO.expr(MONGO.EXPR.FALSE)
    );

  m.setUserPermissions = (req, permissions) => {
    req.permissions = permissions;
  };

  m.getRolesToPermissions = () =>
    appLib.db
      .collection('roles')
      .find(appLib.dba.getConditionForActualRecord())
      .toArray()
      .then(roles => {
        const rolesToPermissions = {};
        roles.forEach(role => {
          rolesToPermissions[role.name] = role.permissions;
        });
        // override permission for superAdmin
        const allAppPermissionsSet = m.getAllAppPermissionsSet();
        const superAdmin = appLib.accessCfg.ROLES.SuperAdmin;
        rolesToPermissions[superAdmin] = Array.from(allAppPermissionsSet);
        return rolesToPermissions;
      })
      .catch(err => {
        log.error(`Error occurred while retrieving roles to permissions: ${err}`);
        throw err;
      });

  m.getUserPermissions = req => {
    if (!appLib.getAuthSettings().enablePermissions) {
      return m.getAllAppPermissionsSet();
    }
    return req.permissions || new Set();
  };

  /**
   * Get user permissions by user roles and auth settings.
   * TODO: add option for object permission, not only array of strings
   * @param user
   * @param deviceType - necessary for adding permission based on deviceType
   */
  m.getPermissionsForUser = (user, deviceType) => {
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

    return appLib.cache
      .getUsingCache(() => m.getRolesToPermissions(), appLib.cache.keys.ROLES_TO_PERMISSIONS)
      .then(rolesToPermissions => {
        // add permissions for each role
        for (const role of allUserRoles) {
          const rolePermissions = rolesToPermissions[role] || [];
          for (const rolePermission of rolePermissions) {
            userPermissions.add(rolePermission);
          }
        }

        return userPermissions;
      });

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
    _.each(scopes, scope => {
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
    const actionActions = new Set();
    _.each(actions.fields, (actionSettings, actionName) => {
      const actionPermissions = actionSettings.permissions;
      if (m.isPermissionGranted(actionPermissions, permissions)) {
        actionActions.add(actionName);
      }
    });
    return actionActions;
  };

  m.getAllAppPermissionsSet = () => {
    // SuperAdmin has all default permissions + declaredPermissions by user
    const defaultPermissions = Object.values(appPermissions);
    const allAppPermissionsSet = new Set([
      ...defaultPermissions,
      ...appLib.declaredPermissionNames,
    ]);
    return allAppPermissionsSet;
  };

  // util methods tied with req
  m.getActions = req => {
    if (req.action === 'datatables') {
      return ['view', 'create', 'update', 'delete'];
    }
    const { method } = req;
    if (method === 'GET') {
      return ['view'];
    }
    if (method === 'POST') {
      return ['create']; // same request action as clone
    }
    if (method === 'PUT') {
      return ['update'];
    }
    if (method === 'DELETE') {
      return ['delete'];
    }
    return [];
  };

  m.getAppModelByReq = req => {
    const modelName = getModelNameByReq(req);
    return _.get(appLib.appModel, `models.${modelName}`);
  };

  m.getScopeConditionsForModel = (req, actionsToAdd) => {
    const model = m.getAppModelByReq(req);
    const userPermissions = m.getUserPermissions(req);
    const actions = actionsToAdd === true ? m.getActions(req) : _.castArray(actionsToAdd);

    const inlineContext = m.getInlineContext(req);

    return m.getObjScopeConditionsForActions(model, userPermissions, actions, inlineContext, true);
  };

  m.getViewConditionsByPermissionsForLookup = (
    userPermissions,
    prepareContext,
    lookup,
    mongoConditions
  ) => {
    if (appLib.getAuthSettings().enablePermissions) {
      const actions = ['view'];
      const appModel = appLib.appModel.models[lookup.table];

      return Promise.all([
        m.getObjScopeConditionsForActions(lookup, userPermissions, actions, prepareContext, false),
        m.getObjScopeConditionsForActions(appModel, userPermissions, actions, prepareContext, true),
      ]).then(([lookupConditions, modelConditions]) =>
        MONGO.and(mongoConditions, lookupConditions, modelConditions)
      );
    }
    return Promise.resolve(mongoConditions);
  };

  m.getModelActionProjections = (req, actionsToAdd) => {
    const actionProjections = {};
    const model = m.getAppModelByReq(req);
    const userPermissions = m.getUserPermissions(req);
    const modelActions = _.keys(_.get(model, 'actions.fields', {}));
    const inlineContext = m.getInlineContext(req);

    return Promise.map(modelActions, action => {
      if (actionsToAdd === true || _.castArray(actionsToAdd).includes(action)) {
        return m
          .getObjScopeConditionsForAction(model, userPermissions, action, inlineContext, true)
          .then(scopeConditionForAction => {
            _.set(actionProjections, `_actions.${action}`, scopeConditionForAction);
          });
      }
      return false;
    }).then(() => actionProjections);
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
        _.each(data, doc =>
          filterDoc(doc, isPermissionGranted, fieldPath, field, isObjectField, isArrayField)
        );
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
   * Clear field considering peculiarity of Location type
   * @param data
   * @param path
   * @param modelPart
   */
  m.clearField = (data, path, modelPart) => {
    _.unset(data, path);
    // workaround for location field (its stored in 2 fields)
    if (modelPart.type === 'Location') {
      const locationFieldName = path[path.length - 1];
      const labelPath = path.slice(0, -1);
      labelPath.push(`${locationFieldName}_label`);
      _.unset(data, labelPath);
    }
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
  m.mergeDocs = ({
    appModel,
    path = [],
    result = {},
    dbDoc,
    userData,
    action,
    userPermissions,
  }) => {
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
      const isArrayField = field.type === 'Array';
      const isObjectField = field.type === 'Object';
      const isLocationField = field.type === 'Location';

      const locationLabelPath = path.concat(`${fieldKey}_label`);
      const userValue = _.get(userData, fieldPath);
      const dbValue = _.get(dbDoc, fieldPath);

      if (!isPermissionGranted) {
        if (isLocationField) {
          setVal(result, locationLabelPath, _.get(dbDoc, locationLabelPath));
        }
        return setVal(result, fieldPath, dbValue);
      }

      if (!isArrayField && !isObjectField) {
        if (isLocationField) {
          setVal(result, locationLabelPath, _.get(userData, locationLabelPath));
        }
        return setVal(result, fieldPath, userValue);
      }

      if (isObjectField) {
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

        // map bu object id no matter whether its String or ObjectID instance
        const mappedDbArray = _.map(userArrValue, userObj => {
          if (!userObj._id) {
            return {};
          }
          const matchedDbDoc = _.find(
            dbValue,
            doc => doc._id && userObj._id.toString() === doc._id.toString()
          );
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
      _.each(actions, action => {
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

  /**
   *
   * @param userPermissions
   * @param inlineContext - used as argument in generated 'where' and 'return' functions
   * @param listsFieldsToGet
   */
  m.getListsForUser = (userPermissions, inlineContext, listsFieldsToGet = appLib.ListsFields) => {
    const allListsForUser = {};
    const isPermissionsEnabled = appLib.getAuthSettings().enablePermissions;

    listsFieldsToGet.forEach(listField => {
      const { type: elemType, required: elemRequired } = _.get(appLib.appModel.models, listField);
      const listPath = `${listField}.list`;
      const { name: listName, values: builtInList, scopes: listScopes } = _.get(
        appLib.appModel.models,
        listPath
      );
      const referencedList = appLib.appModelHelpers.Lists[listName];
      const listValues = referencedList || builtInList;

      if (!isPermissionsEnabled) {
        allListsForUser[listField] = listValues;
        return;
      }

      // here we collect lists available for each scope for current listPath
      // then merge these lists into one result list
      const listsForScopes = [];
      const { args, values } = getDefaultArgsAndValuesForInlineCode();
      _.each(listScopes, (listScope, listScopeName) => {
        const scopePermission = _.get(listScope, `permissions.view`);
        const isScopePermissionGranted = m.isPermissionGranted(scopePermission, userPermissions);

        const whereList = {};
        if (isScopePermissionGranted) {
          const whereFunc = new Function(`val, key, ${args}`, listScope.where);
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
                e
              );
            }
          });
        }

        let returnedListForScope;
        try {
          const formListFunc = new Function(`$list, ${args}`, listScope.return);
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
      const mergedListForScopes = listsForScopes.reduce(
        (result, current) => _.merge(result, current),
        {}
      );

      allListsForUser[listField] = {
        type: elemType,
        required: elemRequired === true || elemRequired === 'true',
        values: mergedListForScopes,
      };
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
      const scopes = _.get(curMenu, 'scopes');

      let actionsFromScopes;
      if (!scopes) {
        // allow all pages if there is no scopes field
        actionsFromScopes = new Set(['view']);
      } else {
        actionsFromScopes = m.getAvailActionsFromScopes(scopes, permissions);
      }

      // delete menu from parent obj or clean up scopes and go deeper
      if (!actionsFromScopes.has('view')) {
        delete parentMenu[path];
      } else {
        delete parentMenu[path].scopes;
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

  m.validateListsValues = (modelName, data, userPermissions, inlineContext) => {
    const listsErrors = [];
    // if (!appLib.getAuthSettings().enablePermissions) {
    //   return listsErrors;
    // }

    const fieldsPathInAppModel = `${modelName}.fields`;

    // transform relative paths of req.body to absolute paths
    const userData = _.reduce(
      data,
      (result, val, key) => {
        const fullPath = `${fieldsPathInAppModel}.${key}`;
        result[fullPath] = val;
        return result;
      },
      {}
    );

    const schemaListsFields = appLib.ListsFields.filter(path =>
      path.startsWith(fieldsPathInAppModel)
    );
    const schemaAllowedLists = m.getListsForUser(userPermissions, inlineContext, schemaListsFields);
    _.each(schemaAllowedLists, (list, fieldPath) => {
      const userVal = userData[fieldPath];

      if (_.isEmpty(userVal) && list.required) {
        listsErrors.push(`Required value must be set for '${fieldPath}'.`);
        return;
      }

      if (list.type.endsWith('[]')) {
        // check array type
        if (!Array.isArray(userVal)) {
          listsErrors.push(`Value '${userVal}' should be an array for '${fieldPath}'.`);
        } else {
          userVal.forEach(val => {
            if (!list.values[val]) {
              listsErrors.push(`Value '${val}' is not allowed for '${fieldPath}'.`);
            }
          });
        }
      } else if (userVal && !list.values[userVal]) {
        listsErrors.push(`Value '${userVal}' is not allowed for '${fieldPath}'.`);
      }
    });
    return listsErrors;
  };

  m.removePermissionsFromObjFields = obj => {
    _.each(obj.fields, (field, fieldKey) => {
      _.unset(obj, ['fields', fieldKey, 'permissions']);
      if (field.fields) {
        m.removePermissionsFromObjFields(field);
      }
    });
  };

  m.injectFieldsInfo = (model, actions, userPermissions) => {
    _.each(model.fields, field => {
      if (!field.permissions || !appLib.getAuthSettings().enablePermissions) {
        field.fieldInfo = { read: true, write: true };
        // go deeper for parent field permissions
        if (field.fields) {
          m.injectFieldsInfo(field, actions, userPermissions);
        }
        return;
      }
      _.each(actions, action => {
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

  function getBaseAppModel() {
    const baseAppModel = _.cloneDeep(appLib.appModel);
    const app = _.get(baseAppModel, 'interface.app');
    if (app) {
      delete app.permissions;
      delete app.preStart;
    }
    delete baseAppModel.rolesToPermissions;
    delete baseAppModel.usedPermissions;

    return baseAppModel;
  }

  m.handleModelByPermissions = (model, userPermissions) => {
    // actions for read and write
    const actions = ['view', 'update'];
    m.injectFieldsInfo(model, actions, userPermissions);
    m.removePermissionsFromObjFields(model);

    const actionsFromScopes = m.getAvailActionsFromScopes(model.scopes, userPermissions);
    const actionsFromActions = m.getAvailActionsFromActions(model.actions, userPermissions);
    const intersectedActions = new Set(
      [...actionsFromActions].filter(a => actionsFromScopes.has(a))
    );

    // delete scopes and permission details
    delete model.scopes;
    _.each(model.actions.fields, (actionSettings, actionName) => {
      if (
        appLib.accessCfg.DEFAULT_ACTIONS.includes(actionName) &&
        !intersectedActions.has(actionName)
      ) {
        delete model.actions.fields[actionName];
      } else {
        delete model.actions.fields[actionName].permissions;
      }
    });
  };

  m.getAuthorizedAppModel = req => {
    const authorizedModel = getBaseAppModel();
    const userPermissions = m.getUserPermissions(req);
    _.each(authorizedModel.models, model => {
      m.handleModelByPermissions(model, userPermissions);
    });

    const inlineContext = m.getInlineContext(req);
    const lists = m.getListsForUser(userPermissions, inlineContext);
    // replace every list field contains 'scopes' and 'values' with plain list values
    _.each(lists, (list, listFieldPath) => {
      _.set(authorizedModel.models, `${listFieldPath}.list`, list.values);
    });
    authorizedModel.interface.mainMenu = m.getMenuForUser(userPermissions, authorizedModel);
    authorizedModel.interface.pages = m.getPagesForUser(userPermissions, authorizedModel);
    _.set(authorizedModel, 'interface.app.deviceType', req.device.type);

    return authorizedModel;
  };

  m.getActionProjections = (req, actionsToAdd) => {
    const actionProjections = {};
    const model = m.getAppModelByReq(req);
    const userPermissions = m.getUserPermissions(req);
    const modelActions = _.keys(_.get(model, 'actions.fields', {}));
    const inlineContext = m.getInlineContext(req);

    return Promise.map(modelActions, action => {
      if (actionsToAdd === true || _.castArray(actionsToAdd).includes(action)) {
        return m
          .getObjScopeConditionsForAction(model, userPermissions, action, inlineContext, true)
          .then(scopeConditionForAction => {
            _.set(actionProjections, `_actions.${action}`, scopeConditionForAction);
          });
      }
    }).then(() => actionProjections);
  };

  m.getUnauthorizedAppModel = req => {
    const userPermissions = m.getUserPermissions(req);
    const unauthorizedModel = getBaseAppModel();
    // actions for read and write
    const actions = ['view', 'update'];
    const { models } = unauthorizedModel;
    unauthorizedModel.models = { users: models.users };
    _.each(unauthorizedModel.models, model => {
      m.injectFieldsInfo(model, actions, userPermissions);
    });

    const menuFields = unauthorizedModel.interface.mainMenu.fields;
    unauthorizedModel.interface.mainMenu.fields = { home: menuFields.home };
    const { pages } = unauthorizedModel.interface;
    unauthorizedModel.interface.pages = { home: pages.home };
    _.set(unauthorizedModel, 'interface.app.deviceType', req.device.type);

    return unauthorizedModel;
  };

  m.getAdminLookupScopeForViewAction = () => ({
    superAdminScope: {
      permissions: {
        view: appPermissions.accessAsSuperAdmin,
      },
      where: JSON.stringify(MONGO.EXPR.TRUE),
    },
  });

  m.getAdminListScopeForViewAction = () => ({
    superAdminScope: {
      permissions: {
        view: appPermissions.accessAsSuperAdmin,
      },
      where: 'return true',
      return: 'return $list',
    },
  });

  m.getFieldActionByModelAction = action => {
    if (action === 'view') {
      return 'read';
    }
    if (action === 'create' || action === 'update') {
      return 'write';
    }
    return null;
  };

  return m;
};
