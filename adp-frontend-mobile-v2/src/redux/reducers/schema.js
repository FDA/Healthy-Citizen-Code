import apiSchema from '../../api/schema';
import {parseSchemas, parseFieldTypes} from '../../helpers/parsers';
import {USER_LOGOUT} from '../consts/user';

// ------------------------------------
// Constants
// ------------------------------------
const SCHEMAS_REQUEST = 'SCHEMAS_REQUEST';
const SCHEMAS_SUCCESS = 'SCHEMAS_SUCCESS';
const SCHEMAS_FAILURE = 'SCHEMAS_FAILURE';

// ------------------------------------
// Actions
// ------------------------------------
export const getSchemas = () => (dispatch) => {
  dispatch({
    type: SCHEMAS_REQUEST
  });

  return Promise.all([
    apiSchema.getSchema(),
    apiSchema.getFieldTypes()
  ])
    .then(([schemeResp, listsResp]) => {
        const fields = parseSchemas(schemeResp.data, parseFieldTypes(listsResp.data));

        dispatch({
          type: SCHEMAS_SUCCESS,
          fields: fields
        });

        return Promise.resolve(fields);
      },
      error => {
        dispatch({
          type: SCHEMAS_FAILURE,
          message: error.message || 'Something went wrong'
        });

        return Promise.reject();
      }
    );
};

// ------------------------------------
// Reducer
// ------------------------------------
const initialState = {
  isFetching: false,
  isReceived: false,
  fields: {}
};

const schemeReducer = (state = initialState, action) => {
  switch (action.type) {
    case USER_LOGOUT:
      return ({...initialState});
    case SCHEMAS_REQUEST:
      return ({...state, isFetching: true});
    case SCHEMAS_SUCCESS:
      return ({...state, isFetching: false, isReceived: true, fields: action.fields});
    case SCHEMAS_FAILURE:
      return ({...state, isFetching: false});
    default:
      return state;
  }
};

export default schemeReducer;
