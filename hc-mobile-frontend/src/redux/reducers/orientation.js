// ------------------------------------
// Constants
// ------------------------------------
const ORIENTATION_CHANGE = 'ORIENTATION_CHANGE';
export const LANDSCAPE = 'LANDSCAPE';
export const PORTRAIT = 'PORTRAIT';

// ------------------------------------
// Actions
// ------------------------------------
export const changeOrientation = (layout) => (dispatch) => {
  const {width, height} = layout;
  const orientation = (width > height) ? LANDSCAPE : PORTRAIT;

  dispatch({
    type: ORIENTATION_CHANGE,
    orientation: orientation
  });
};

// ------------------------------------
// Reducer
// ------------------------------------
const initialState = {
  orientation: null
};

const orientationReducer = (state = initialState, action) => {
  switch (action.type) {
    case ORIENTATION_CHANGE:
      return ({...state, orientation: action.orientation});
    default:
      return state;
  }
};

export default orientationReducer;
