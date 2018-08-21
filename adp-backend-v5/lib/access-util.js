const butil = require('./backend-util');
const _ = require('lodash');

module.exports = function (appLib) {
  const m = {};

  function getEvaluatedScopeCondition (scopeCondition, prepareContext) {
    try {
      return butil.evalWithContext(scopeCondition, prepareContext);
    } catch (e) {
      appLib.log.error(`Error occurred during evaluating scopeCondition (${scopeCondition}): ${e}`);
    }
    return {};
  }


  function isArrayConditionPassed (actionPermissions, permissions) {
    // here we check AND condition
    return _.every(actionPermissions, (permissionElem) => {
      if (_.isArray(permissionElem)) {
        // here we check OR condition
        return _.some(permissionElem, (nestedPermission) => permissions.has(nestedPermission));
      } else if (_.isString(permissionElem)) {
        return permissions.has(permissionElem);
      }
      // log.trace(`Invalid type value for actionSettings ${JSON.stringify(actionSettings)}: ${JSON.stringify(permissionElem)}`);
      return false;
    });
  }

  m.isPermissionGranted = (actionPermissions, permissions) => {
    const hasStringPermission = _.isString(actionPermissions) && permissions.has(actionPermissions);
    const hasArrayPermission = _.isArray(actionPermissions) && isArrayConditionPassed(actionPermissions, permissions);
    if (hasStringPermission || hasArrayPermission) {
      return true;
    }
    return false;
  };

  /**
   * Get context for preparation functions. Currently it includes request object.
   * @param req
   * @returns {*}
   */
  m.getPrepareContext = (req) => {
    return {req};
  };

  /**
   * Retrieves user context by request
   */
  m.getUserContext = (req) => {
    return req.user;
  };

  /**
   * Gets scope condition from actionsObj for one specified action.
   * @param actionsObj could be any object with correct format of 'actions' and 'scopes' fields and its entries.
   * Schema or lookup can be passed here.
   * @param userPermissions
   * @param action to retrieve conditions for
   * @param prepareContext needed for preparation specified in 'prepare' field
   * @returns {Promise<any>}
   */
  m.getObjScopeConditionsForAction = (actionsObj, userPermissions, action, prepareContext, isCheckActionPermissions) => {
    if (isCheckActionPermissions) {
      const actionPermissions = _.get(actionsObj, `actions.fields[${action}].permissions`);
      const isActionPermissionGranted = m.isPermissionGranted(actionPermissions, userPermissions);
      if (!isActionPermissionGranted) {
        return Promise.resolve(butil.MONGO_CONST.EXPR.FALSE);
      }
    }

    const scopeConditionsPromises = [];
    _.forEach(actionsObj.scopes, (modelScope) => {
      const scopePermission = _.get(modelScope, `permissions.${action}`);
      const isScopePermissionGranted = m.isPermissionGranted(scopePermission, userPermissions);
      const scopeCondition = _.get(modelScope, `where`);
      if (isScopePermissionGranted && scopeCondition) {
        const preparationName = _.get(modelScope, `prepare`);
        const preparationPromiseFunc = appLib.appModelHelpers.Preparations[preparationName];
        if (preparationPromiseFunc) {
          const scopeConditionPromise = preparationPromiseFunc()
            .then((scopeVars) => {
              const newPrepareContext = _.clone(prepareContext);
              newPrepareContext.scopeVars = scopeVars || {};
              return getEvaluatedScopeCondition(scopeCondition, newPrepareContext);
            });
          scopeConditionsPromises.push(scopeConditionPromise);
        } else {
          const newPrepareContext = _.clone(prepareContext);
          const evaluatedScopeCondition = getEvaluatedScopeCondition(scopeCondition, newPrepareContext);
          scopeConditionsPromises.push(evaluatedScopeCondition);
        }
      }
    });
    if (!scopeConditionsPromises.length) {
      return Promise.resolve(butil.MONGO_CONST.EXPR.FALSE);
    }
    return Promise.all(scopeConditionsPromises)
      .then(scopeConditions => {
        let newScopeConditions = scopeConditions.filter(sc => !_.isEmpty(sc));
        return {$or: newScopeConditions.length ? newScopeConditions : butil.MONGO_CONST.EXPR.FALSE};
      });
  };

  /**
   * Multiple handler for getObjScopeConditionsForAction. Aggregates all scope conditions for actions.
   * @param actionsObj
   * @param userPermissions
   * @param actions
   * @param prepareContext
   */
  m.getObjScopeConditionsForActions = (actionsObj, userPermissions, actions, prepareContext, isCheckActionPermissions) => {
    return Promise.map(actions, (action) => {
        return m.getObjScopeConditionsForAction(actionsObj, userPermissions, action, prepareContext, isCheckActionPermissions)
          .then((scopeConditions) => {
            const exprCondition = {$expr: scopeConditions};
            return exprCondition;
          });
      })
      .then((allActionsConditions) => {
        return allActionsConditions.length ? {$or: allActionsConditions} : {$expr: butil.MONGO_CONST.EXPR.FALSE};
      });
  };


  m.setUserPermissions = (req, permissions) => {
    req.permissions = permissions;
  };

  m.getUserPermissions = (req) => {
    if (!appLib.getAuthSettings().enablePermissions) {
      return m.getAllAppPermissionsSet();
    }
    return req.permissions || new Set();
  };

  /*  m.getGuestPermissions = function () {
      return new Set(appLib.appModel.rolesToPermissions['Guest']);
    };*/

  /**
   * Get user permissions by user roles and auth settings. Inject permissions into req.permissions.
   * TODO: add option for object permission, not only array of strings
   * @param req
   */
  m.injectUserPermissions = (req) => {
    const allUserRoles = new Set();
    if (req.user) {
      allUserRoles.add(appLib.accessCfg.ROLES.User);
    } else {
      allUserRoles.add(appLib.accessCfg.ROLES.Guest);
    }

    const dbUserRoles = _.get(req.user, 'roles', []);
    for (const role of dbUserRoles) {
      allUserRoles.add(role);
    }
    const userPermissions = getImplicitPermissionsFromAuthSettings();

    for (const role of allUserRoles) {
      const rolePermissions = appLib.appModel.rolesToPermissions[role] || [];
      for (const rolePermission of rolePermissions) {
        userPermissions.add(rolePermission);
      }
    }
    m.setUserPermissions(req, userPermissions);

    /**
     * According to 'App-wide Parameters and Changes to Overall App Behavior' https://confluence.conceptant.com/pages/viewpage.action?pageId=1016055
     * Some permissions will be granted based on auth settings
     */
    function getImplicitPermissionsFromAuthSettings () {
      const implicitPermissions = new Set();
      if (appLib.getAuthSettings().enableRegistration === true) {
        implicitPermissions.add(appLib.accessCfg.PERMISSIONS.createUserAccounts);
      }
      return implicitPermissions;
    }
  };

  m.getListsForUser = (req, listsFieldsToGet = appLib.ListsFields) => {
    const allListsForUser = {};
    const isPermissionsEnabled = appLib.getAuthSettings().enablePermissions;
    const userPermissions = m.getUserPermissions(req);

    listsFieldsToGet.forEach((listField) => {
      const {type: elemType, required: elemRequired } = _.get(appLib.appModel.models, `${listField}`);
      const listPath = listField + '.list';
      let {name: listName, values: builtInList, scopes: listScopes} = _.get(appLib.appModel.models, listPath);
      const referencedList = appLib.appModelHelpers.Lists[listName];
      const listValues = referencedList || builtInList;

      if (!isPermissionsEnabled) {
        allListsForUser[listField] = listValues;
        return;
      }

      // here we collect lists available for each scope for current listPath
      // then merge these lists into one result list
      const listsForScopes = [];
      _.forEach(listScopes, (listScope, listScopeName) => {
        const scopePermission = _.get(listScope, `permissions.view`);
        const isScopePermissionGranted = m.isPermissionGranted(scopePermission, userPermissions);

        const whereList = {};
        if (isScopePermissionGranted) {
          const whereFunc = new Function('val, key', listScope.where);
          _.forEach(listValues, (val, key) => {
            try {
              const isWherePassed = whereFunc(val, key);
              if (isWherePassed === true) {
                whereList[key] = val;
              }
            } catch (e) {
              appLib.log.error(
                `Error occurred during calculating where condition for listPath='${listPath}'. ` +
                `Element: val='${val}', key='${key}'. ` +
                `This element will not be included in result list for scope '${listScopeName}'.\n`,
                e,
              );
            }
          });
        }

        let returnedListForScope;
        try {
          const formListFunc = new Function('$list', listScope.return);
          returnedListForScope = formListFunc(whereList);
        } catch (e) {
          returnedListForScope = {};
          appLib.log.error(
            `Error occurred during list generation for scope ${listScope} for path ${listPath}. ` +
            `Applied empty object for this list.\n`,
            e,
          );
        }

        listsForScopes.push(returnedListForScope);
      });
      const mergedListForScopes = listsForScopes.reduce((result, current) => {
        return _.merge(result, current);
      }, {});

      allListsForUser[listField] = {
        type: elemType,
        required: elemRequired === true || elemRequired === 'true',
        values: mergedListForScopes
      };
    });

    return allListsForUser;
  };

  m.validateListsValues = function (req) {
    const listsErrors = [];
    // if (!appLib.getAuthSettings().enablePermissions) {
    //   return listsErrors;
    // }

    const urlParts = butil.getUrlParts(req);
    const fieldsPathInAppModel = _(urlParts).filter((val, idx) => !(idx % 2)).join('.fields.') + '.fields';

    // transform relative paths of req.body to absolute paths
    const userData = _.reduce(req.body.data, (result, val, key) => {
      const fullPath = fieldsPathInAppModel + '.' + key;
      result[fullPath] = val;
      return result;
    }, {});

    const schemaListsFields = appLib.ListsFields.filter((path) => path.startsWith(fieldsPathInAppModel));
    const schemaAllowedLists = appLib.accessUtil.getListsForUser(req, schemaListsFields);
    _.forEach(schemaAllowedLists, (list, fieldPath) => {
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
      } else {
        // check single type
        if (userVal && !list.values[userVal]) {
          listsErrors.push(`Value '${userVal}' is not allowed for '${fieldPath}'.`);
        }
      }
    });
    return listsErrors;
  };

  m.getAvailActionsFromScopes = (scopes, permissions) => {
    const scopeActions = new Set();
    _.forOwn(scopes, (scope, scopeName) => {
      const scopePermissions = scope.permissions;
      if (_.isPlainObject(scopePermissions)) {
        _.forOwn(scopePermissions, (permissionName, actionName) => {
          if (_.isString(permissionName) && permissions.has(permissionName)) {
            scopeActions.add(actionName);
          }
        });
      }
    });
    return scopeActions;
  };

  m.getAvailActionsFromActions = (actions, permissions) => {
    const actionActions = new Set();
    _.forOwn(actions.fields, (actionSettings, actionName) => {
      const actionPermissions = actionSettings.permissions;
      if (m.isPermissionGranted(actionPermissions, permissions)) {
        actionActions.add(actionName);
      }
    });
    return actionActions;
  };

  m.getAllAppPermissionsSet = () => {
    // SuperAdmin has all default permissions + declaredPermissions by user
    const defaultPermissions = Object.values(appLib.accessCfg.PERMISSIONS);
    const allAppPermissionsSet = new Set([...defaultPermissions, ...appLib.declaredPermissionNames]);
    return allAppPermissionsSet;
  };

  // util methods tied with req
  m.getActions = (req) => {
    if (req.action === 'datatables') {
      return ['view', 'create', 'update', 'delete'];
    }
    const method = req.method;
    if (method === 'GET') {
      return ['view'];
    } else if (method === 'POST') {
      return ['create']; // same request action as clone
    } else if (method === 'PUT') {
      return ['update'];
    } else if (method === 'DELETE') {
      return ['delete'];
    }
  };

  m.getModelByReq = (req) => {
    const urlParts = butil.getUrlParts(req);
    const appModelPath = _(urlParts).filter((val, idx) => !(idx % 2)).join('.fields.');
    const model = _.get(appLib.appModel, `models.${appModelPath}`);
    return model;
  };

  m.getScopeConditionsForModel = (req, actionsToAdd) => {
    const model = m.getModelByReq(req);
    const userPermissions = appLib.accessUtil.getUserPermissions(req);
    const actions = actionsToAdd === true ? m.getActions(req) : _.castArray(actionsToAdd);

    const prepareContext = appLib.accessUtil.getPrepareContext(req);

    return appLib.accessUtil.getObjScopeConditionsForActions(model, userPermissions, actions, prepareContext, true);
  };

  m.getViewConditionsByPermissionsForLookup = (req, lookup, mongoConditions) => {
    if (appLib.getAuthSettings().enablePermissions) {
      return m.getScopeConditionsForLookup(req, lookup)
        .then((scopeConditions) => {
          return {$and: [mongoConditions, scopeConditions]};
        });
    }
    return Promise.resolve(mongoConditions);
  };

  m.getScopeConditionsForLookup = (req, lookup) => {
    const userPermissions = appLib.accessUtil.getUserPermissions(req);
    const actions = ['view'];
    const prepareContext = appLib.accessUtil.getPrepareContext(req);

    return appLib.accessUtil.getObjScopeConditionsForActions(lookup, userPermissions, actions, prepareContext, false);
  };

  m.getActionProjections = (req, actionsToAdd) => {
    const actionProjections = {};
    const model = m.getModelByReq(req);
    const userPermissions = appLib.accessUtil.getUserPermissions(req);
    const modelActions = _.keys(_.get(model, 'actions.fields', {}));
    const prepareContext = appLib.accessUtil.getPrepareContext(req);

    return Promise.map(modelActions, action => {
        if (actionsToAdd === true || _.castArray(actionsToAdd).includes(action)) {
          return appLib.accessUtil.getObjScopeConditionsForAction(model, userPermissions, action, prepareContext, true)
            .then((scopeConditionForAction) => {
              _.set(actionProjections, `_actions.${action}`, scopeConditionForAction);
            });
        }
      })
      .then(() => actionProjections);
  };

  return m;
};
