import _ from 'lodash';

// ------------------------------------
// Constants
// ------------------------------------
const ADD_FILE_TO_UPLOAD = 'ADD_FILE_TO_UPLOAD';
const REMOVE_FILE_TO_UPLOAD = 'REMOVE_FILE_TO_UPLOAD';
const SET_UPLOADED_FILES = 'SET_UPLOADED_FILES';
const UPDATE_FILE_PROGRESS = 'UPDATE_FILE_PROGRESS';
const CLEAR_STATE = 'CLEAR_STATE';

// ------------------------------------
// Actions
// ------------------------------------

export const addFileToUpload = (formUrl, fieldId, file) => (dispatch, getState) => {
  dispatch({
    type: ADD_FILE_TO_UPLOAD,
    formUrl,
    fieldId,
    file
  });
};

export const removeFileToUpload = (formUrl, fieldId, key) => (dispatch, getState) => {
  dispatch({
    type: REMOVE_FILE_TO_UPLOAD,
    formUrl,
    fieldId,
    key
  });
};

export const setUploadedFiles = (formUrl, fieldId, files) => (dispatch, getState) => {
  dispatch({
    type: SET_UPLOADED_FILES,
    formUrl,
    fieldId,
    files
  });
};


export const updateFileProgress = (formUrl, fieldId, progress) => (dispatch, getState) => {
  dispatch({
    type: UPDATE_FILE_PROGRESS,
    formUrl,
    fieldId,
    progress
  });
};

export const clearState = () => (dispatch, getState) => {
  dispatch({
    type: CLEAR_STATE
  });
};

// ------------------------------------
// Reducer
// ------------------------------------
const initialState = {
  files: {},
  progress: {}
};

const dataReducer = (state = initialState, action) => {
  let newState = {...state};
  switch (action.type) {
    case ADD_FILE_TO_UPLOAD:
      _.set(newState, ['files', action.formUrl, action.fieldId, action.file.uri], action.file);
      return newState;
    case REMOVE_FILE_TO_UPLOAD:
      newState = _.omit(newState, ['files', action.formUrl, action.fieldId, action.key]);
      return newState;
    case SET_UPLOADED_FILES:
      _.set(newState, ['files', action.formUrl, action.fieldId], action.files);
      return newState;
    case UPDATE_FILE_PROGRESS:
      const prevProgress = _.get(state, ['progress', action.formUrl, action.fieldId], {});
      _.set(newState, ['progress', action.formUrl, action.fieldId], {...prevProgress, ...action.progress});
      return newState;
    case CLEAR_STATE:
      return {};
    default:
      return state;
  }
};

export default dataReducer;
