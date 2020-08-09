import apiData from '../../api/data';
import {parseData, parseDataFields, createDataResultPathIfNotExists} from '../../helpers/parsers';
import {USER_LOGOUT} from '../consts/user';

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

// ------------------------------------
// Actions
// ------------------------------------
export const getData = (fieldsSchema, piiId, phiId) => (dispatch, getState) => {
  dispatch({
    type: DATA_REQUEST
  });

  return Promise.all([
    apiData.getPIIs(piiId),
    apiData.getPHIs(phiId),
    // apiData.getNotifications()
  ]).then(
    responses => {
      const parsedPIIs = parseData(fieldsSchema, [responses[0].data], '/piis', '/piis');
      const parsedPHIs = parseData(fieldsSchema, [responses[1].data], '/phis', '/phis');
      // const parsedNotifications = parseData(fieldsSchema, responses[2].data, '/notifications', '/notifications');
      const data = {
        ...parsedPIIs,
        ...parsedPHIs,
        // ...parsedNotifications
      };
      const profile = parseDataFields(fieldsSchema['/piis'].fields, responses[0].data);

      dispatch({
        type: DATA_SUCCESS,
        data,
        profile
      });

      return Promise.resolve(data);
    },
    error => {
      dispatch({
        type: DATA_FAILURE,
        message: error.message || 'Something went wrong'
      });

      return Promise.reject();
    }
  );
};

export const addData = (fullPath, path, fieldsSchema, data) => (dispatch, getState) => {
  dispatch({
    type: DATA_SENDING_REQUEST
  });

  return apiData.add(fullPath, data).then(
    response => {
      dispatch({
        type: DATA_SENDING_SUCCESS,
        updatedData: {
          path,
          fullPath,
          itemId: response.id,
          data: parseDataFields(fieldsSchema, {
            ...data,
            _id: response.id
          })
        }
      });

      return Promise.resolve({
        id: response.id
      });
    },
    error => {
      dispatch({
        type: DATA_SENDING_FAILURE,
        message: error.message || 'Something went wrong'
      });

      return Promise.reject({
        message: error.message || 'Something went wrong'
      });
    }
  );
};

export const saveData = (fullPath, path, itemId, fieldsSchema, data) => (dispatch, getState) => {
  dispatch({
    type: DATA_SENDING_REQUEST
  });

  return apiData.update(`${fullPath}/${itemId}`, data).then(
    response => {
      dispatch({
        type: DATA_SENDING_SUCCESS,
        updatedData: {
          path,
          itemId,
          data: parseDataFields(fieldsSchema, data)
        }
      });

      return Promise.resolve();
    },
    error => {
      dispatch({
        type: DATA_SENDING_FAILURE,
        message: error.message || 'Something went wrong'
      });

      return Promise.reject({
        message: error.message || 'Something went wrong'
      });
    }
  );
};

export const deleteData = (fullPath, path, itemId) => (dispatch, getState) => {
  dispatch({
    type: DATA_DELETING_REQUEST
  });

  return apiData.delete(`${fullPath}/${itemId}`).then(
    response => {
      dispatch({
        type: DATA_DELETING_SUCCESS,
        removedData: {
          path,
          itemId
        }
      });

      return Promise.resolve();
    },
    error => {
      dispatch({
        type: DATA_DELETING_FAILURE,
        message: error.message || 'Something went wrong'
      });

      return Promise.reject({
        message: error.message || 'Something went wrong'
      });
    }
  );
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
