import apiInterface from '../../api/interface';
import {parseInterface} from '../../helpers/parsers';
import {USER_LOGOUT} from '../consts/user';

// ------------------------------------
// Constants
// ------------------------------------
const INTERFACE_REQUEST = 'INTERFACE_REQUEST';
const INTERFACE_SUCCESS = 'INTERFACE_SUCCESS';
const INTERFACE_FAILURE = 'INTERFACE_FAILURE';

// ------------------------------------
// Actions
// ------------------------------------
export const getInterface = () => (dispatch, getState) => {
  dispatch({
    type: INTERFACE_REQUEST
  });

  return apiInterface.get().then(
    response => {
      dispatch({
        type: INTERFACE_SUCCESS,
        interfaces: parseInterface(response.data.main_menu.fields)
      });

      return Promise.resolve();
    },
    error => {
      dispatch({
        type: INTERFACE_FAILURE,
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
  data: []
};

const interfaceReducer = (state = initialState, action) => {
  switch (action.type) {
    case USER_LOGOUT:
      return ({...initialState});
    case INTERFACE_REQUEST:
      return ({...state, isFetching: true});
    case INTERFACE_SUCCESS:
      return ({...state, isFetching: false, isReceived: true, data: action.interfaces});
    case INTERFACE_FAILURE:
      return ({...state, isFetching: false});
    default:
      return state;
  }
};

export default interfaceReducer;
