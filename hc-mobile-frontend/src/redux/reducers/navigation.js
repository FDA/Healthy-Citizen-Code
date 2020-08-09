import {getRoutes} from '../../routes';

// ------------------------------------
// Reducer
// ------------------------------------
const navigationReducer = (state, action) => getRoutes().router.getStateForAction(action, state);

export default navigationReducer;
