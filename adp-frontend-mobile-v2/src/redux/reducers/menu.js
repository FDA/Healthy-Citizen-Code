import {USER_LOGOUT} from '../consts/user';

// ------------------------------------
// Constants
// ------------------------------------
const MENU_LOCK = 'MENU_LOCK';
const MENU_UNLOCK = 'MENU_UNLOCK';

// ------------------------------------
// Actions
// ------------------------------------
export const lockMenu = () => (dispatch) => {
  dispatch({
    type: MENU_LOCK
  });
};

export const unlockMenu = () => (dispatch) => {
  dispatch({
    type: MENU_UNLOCK
  });
};

// ------------------------------------
// Reducer
// ------------------------------------
const initialState = {
  locked: true
};

const menuReducer = (state = initialState, action) => {
  switch (action.type) {
    case USER_LOGOUT:
      return ({...initialState});
    case MENU_LOCK:
      return ({...state, locked: true});
    case MENU_UNLOCK:
      return ({...state, locked: false});
    default:
      return state;
  }
};

export default menuReducer;
