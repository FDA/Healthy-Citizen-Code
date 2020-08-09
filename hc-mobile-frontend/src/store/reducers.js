import {combineReducers} from 'redux';
import navigationReducer from '../redux/reducers/navigation';
import orientationReducer from '../redux/reducers/orientation';
import menuReducer from '../redux/reducers/menu';
import authReducer from '../redux/reducers/auth';
import interfaceReducer from '../redux/reducers/interface';
import dashboardReducer from '../redux/reducers/dashboard';
import schemaReducer from '../redux/reducers/schema';
import dataReducer from '../redux/reducers/data';

export const makeRootReducer = (asyncReducers) => {
  return combineReducers({
    navigation: navigationReducer,
    orientation: orientationReducer,
    menu: menuReducer,
    auth: authReducer,
    interface: interfaceReducer,
    dashboard: dashboardReducer,
    schema: schemaReducer,
    data: dataReducer,
    ...asyncReducers
  });
};

export const injectReducer = (store, {key, reducer}) => {
  store.asyncReducers[key] = reducer;
  store.replaceReducer(makeRootReducer(store.asyncReducers));
};

export default makeRootReducer;
