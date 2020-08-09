import apiAuth from '../../api/auth';
import {USER_LOGOUT} from '../consts/user';

// ------------------------------------
// Constants
// ------------------------------------
const AUTH_REQUEST = 'AUTH_REQUEST';
const AUTH_SUCCESS = 'AUTH_SUCCESS';
const AUTH_FAILURE = 'AUTH_FAILURE';

// ------------------------------------
// Actions
// ------------------------------------
export const auth = (login, pass) => (dispatch) => {
  dispatch({
    type: AUTH_REQUEST
  });

  return apiAuth.auth(login, pass).then(
    response => {
      dispatch({
        type: AUTH_SUCCESS
      });

      return Promise.resolve(response.data);
    },
    error => {
      dispatch({
        type: AUTH_FAILURE,
        message: error.message || 'Something went wrong'
      });

      return Promise.reject(error.message || 'Something went wrong');
    }
  );
};

// ------------------------------------
// Reducer
// ------------------------------------
const initialState = {
  isFetching: false,
  isReceived: false
};

const authReducer = (state = initialState, action) => {
  switch (action.type) {
    case USER_LOGOUT:
      return ({...initialState});
    case AUTH_REQUEST:
      return ({...state, isFetching: true, isReceived: false});
    case AUTH_SUCCESS:
      return ({...state, isFetching: false, isReceived: true});
    case AUTH_FAILURE:
      return ({...state, isFetching: false});
    default:
      return state;
  }
};

export default authReducer;
