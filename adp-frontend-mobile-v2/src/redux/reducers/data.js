import apiData from '../../api/data';
import {parseData, parseDataFields, createDataResultPathIfNotExists} from '../../helpers/parsers';
import {USER_LOGOUT} from '../consts/user';
import _ from 'lodash';
import logger from '../../services/logger';
import {getStorageItem} from '../../services/globalStorage';
import {getOption} from '../../services/localStorage';

// ------------------------------------
// Constants
// ------------------------------------
const DATA_REQUEST = 'DATA_REQUEST';
const DATA_SUCCESS = 'DATA_SUCCESS';
const DATA_FAILURE = 'DATA_FAILURE';
const DATA_SENDING_REQUEST = 'DATA_SENDING_REQUEST';
const DATA_SENDING_SUCCESS = 'DATA_SENDING_SUCCESS';
const DATA_SENDING_FAILURE = 'DATA_SENDING_FAILURE';
const DATA_DELETING_REQUEST = 'DATA_DELETING_REQUEST';
const DATA_DELETING_SUCCESS = 'DATA_DELETING_SUCCESS';
const DATA_DELETING_FAILURE = 'DATA_DELETING_FAILURE';

/**
 *
 * @param interfaces
 * @param interfacesInfo
 * @param allParams unique params that are used in one or many links.
 * @returns {{interfacesInfo: {}, allParams: Array}}
 * @private
 */
const _traverseInterfaces = (interfaces, interfacesInfo = {}, allParams = []) => {
  _.forEach(interfaces, int => {
    const link = _.get(int, 'params.currentPath');
    if (link && link.startsWith('/')) {
      // TODO: do we need to handle edge param? Like '/userRecords/:userRecordId'
      const linkWithoutParams = link.replace(/:.+?\//, '');
      const params = (link.match(/:[\w]+?\b/g) || []).map(s => s.substr(1));
      interfacesInfo[linkWithoutParams] = {
        originalLink: link,
        params
      };

      _.forEach(params, param => {
        if (!allParams.includes(param)) {
          allParams.push(param);
        }
      });
    }
    _traverseInterfaces(int.submenu, interfacesInfo, allParams);
  });
  return {interfacesInfo, allParams};
};

// ------------------------------------
// Actions
// ------------------------------------
export const getData = (fieldsSchema, interfaces) => (dispatch) => {
  dispatch({
    type: DATA_REQUEST
  });

  const {interfacesInfo, allParams} = _traverseInterfaces(interfaces);
  const allParamsPromises = [];
  _.forEach(allParams, (param) => {
    allParamsPromises.push(getOption(param) || getStorageItem(param));
  });
  return Promise.all(allParamsPromises)
    .then(allParamsValues => {
      const preparedParams = _.zipObject(allParams, allParamsValues);
      const dataPromises = [];
      _.forEach(interfacesInfo, (interfaceInfo, linkWithoutParams) => {
        const dataPromise = apiData.getSchemeData(interfaceInfo.originalLink, interfaceInfo.params, preparedParams)
          .then(schemeData => {
            const data = _.isArray(schemeData.data) ? schemeData.data : [schemeData.data];
            const parsedData = parseData(fieldsSchema, data, linkWithoutParams, linkWithoutParams);
            return parsedData;
          })
          .catch(err => {
            logger.log(`Error occurred for interfaceInfo: ${JSON.stringify(interfaceInfo)}: ${err}`);
            return {};
          });
        dataPromises.push(dataPromise);
      });
      return Promise.all(dataPromises);
    })
    .then((parsedSchemeDataArray) => {
      const userRecordId = getOption('userRecordId');
      return Promise.all([
        parsedSchemeDataArray,
        userRecordId ? apiData.getUserRecords(userRecordId) : {},
        apiData.getModelCode(),
        // apiData.getAppModel(),
        // apiData.getNotifications()
      ])
    })
    .then(([parsedSchemeDataArray, userRecordResp, modelCode]) => {
      let parsedSchemeData = {};
      parsedSchemeDataArray.forEach(parsedScheme => {
        if (!_.isEmpty(parsedScheme)) {
          return _.merge(parsedSchemeData, parsedScheme);
        }
      });

      const userRecordData = userRecordResp.data;
      const parsedUserRecords = parseData(fieldsSchema, [userRecordData], '/userRecords', '/userRecords');

      const modelFunc = new Function('', modelCode);
      // should write appModelHelpers object into this scope
      let modelHelpers = {};
      try {
        modelFunc();
        modelHelpers = appModelHelpers || {};
      } catch (e) {
        logger.warn(`There is no model code from backend: ${e}`);
      }

      // const parsedNotifications = parseData(fieldsSchema, responses[3].data, '/notifications', '/notifications');
      const data = {
        ...parsedSchemeData,
        ...parsedUserRecords,
        modelHelpers
        // ...parsedNotifications
      };
      const profile = parseDataFields(fieldsSchema['/userRecords'].fields, userRecordData);

      dispatch({
        type: DATA_SUCCESS,
        data,
        profile
      });

      return Promise.resolve(data);
    })
    .catch(error => {
      logger.error(error);
      const errorMessage = error.message || 'Something went wrong';
      dispatch({
        type: DATA_FAILURE,
        message: errorMessage
      });

      return Promise.reject(errorMessage);
    });
};

function removeSyntFields (fieldsSchema, data) {
  const syntFields = _.reduce(fieldsSchema, (syntFields, f, fName) => {
    f.synthesize && syntFields.push(fName);
    return syntFields;
  }, []);
  _.omit(data, syntFields);
}

export const addData = (fullPath, path, fieldsSchema, data) => (dispatch) => {
  dispatch({
    type: DATA_SENDING_REQUEST
  });
  removeSyntFields(fieldsSchema, data);

  let addedItemId;
  return apiData.add(fullPath, data)
    .then((response) => {
      // get added item from the server to get synthesize fields
      addedItemId = response.id;
      return apiData.get(`${fullPath}/${addedItemId}`);
    })
    .then(addedItemResp => {
      const addedItem = addedItemResp.data;
      dispatch({
        type: DATA_SENDING_SUCCESS,
        updatedData: {
          path,
          fullPath,
          itemId: addedItem.id,
          data: parseDataFields(fieldsSchema, {
            ...addedItem,
            _id: addedItem.id
          })
        }
      });

      return Promise.resolve({id: addedItem.id});
    })
    .catch(error => {
      dispatch({
        type: DATA_SENDING_FAILURE,
        message: error.message || 'Something went wrong'
      });

      return Promise.reject({
        message: error.message || 'Something went wrong'
      });
    });
};

export const saveData = (fullPath, path, itemId, fieldsSchema, data) => (dispatch) => {
  dispatch({
    type: DATA_SENDING_REQUEST
  });
  removeSyntFields(fieldsSchema, data);

  return apiData.update(`${fullPath}/${itemId}`, data)
    .then(() => {
      // get added item from the server to get synthesize fields
      return apiData.get(`${fullPath}/${itemId}`);
    })
    .then(addedItemResp => {
      dispatch({
        type: DATA_SENDING_SUCCESS,
        updatedData: {
          path,
          itemId,
          data: parseDataFields(fieldsSchema, addedItemResp.data)
        }
      });

      return Promise.resolve();
    })
    .catch(error => {
      dispatch({
        type: DATA_SENDING_FAILURE,
        message: error.message || 'Something went wrong'
      });

      return Promise.reject({
        message: error.message || 'Something went wrong'
      });
    });
};

export const deleteData = (fullPath, path, itemId) => (dispatch) => {
  dispatch({
    type: DATA_DELETING_REQUEST
  });

  return apiData.delete(`${fullPath}/${itemId}`)
    .then(() => {
      dispatch({
        type: DATA_DELETING_SUCCESS,
        removedData: {
          path,
          itemId
        }
      });

      return Promise.resolve();
    })
    .catch(error => {
      dispatch({
        type: DATA_DELETING_FAILURE,
        message: error.message || 'Something went wrong'
      });

      return Promise.reject({
        message: error.message || 'Something went wrong'
      });
    });
};

// ------------------------------------
// Reducer
// ------------------------------------
const initialState = {
  data: {},
  profile: null,
  isFetching: false,
  isReceived: false,
  isDataSaving: false,
  isDataSaved: false,
  isDataDeleting: false,
  isDataDeleted: false
};

const dataReducer = (state = initialState, action) => {
  switch (action.type) {
    case USER_LOGOUT:
      return ({...initialState});
    case DATA_REQUEST:
      return ({...state, isFetching: true});
    case DATA_SUCCESS:
      return ({...state, isFetching: false, isReceived: true, data: action.data, profile: action.profile});
    case DATA_FAILURE:
      return ({...state, isFetching: false});
    case DATA_SENDING_REQUEST:
      return ({...state, isDataSaving: true});
    case DATA_SENDING_SUCCESS:
      const updatedData = Object.assign({}, state.data);
      if (typeof updatedData[action.updatedData.path] === 'undefined') {
        createDataResultPathIfNotExists(updatedData, action.updatedData.path, action.updatedData.fullPath);
      }
      updatedData[action.updatedData.path].items[action.updatedData.itemId] = action.updatedData.data;

      return ({
        ...state,
        isDataSaving: false,
        isDataSaved: true,
        data: updatedData
      });
    case DATA_SENDING_FAILURE:
      return ({...state, isDataSaving: false});
    case DATA_DELETING_REQUEST:
      return ({...state, isDataDeleting: true, isDataDeleted: false});
    case DATA_DELETING_SUCCESS:
      const updatedDataAfterRemoving = Object.assign({}, state.data);
      delete updatedDataAfterRemoving[action.removedData.path].items[action.removedData.itemId];

      return ({
        ...state,
        isDataDeleting: false,
        isDataDeleted: true,
        data: updatedDataAfterRemoving
      });
    case DATA_DELETING_FAILURE:
      return ({...state, isDataDeleting: false});
    default:
      return state;
  }
};

export default dataReducer;
