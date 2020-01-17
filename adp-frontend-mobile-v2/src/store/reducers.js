import {combineReducers} from 'redux';
import navigationReducer from '../redux/reducers/navigation';
import orientationReducer from '../redux/reducers/orientation';
import menuReducer from '../redux/reducers/menu';
import authReducer from '../redux/reducers/auth';
import interfaceDashboardReducer from '../redux/reducers/interfaceDashboard';
// import dashboardReducer from '../redux/reducers/dashboard';
import schemaReducer from '../redux/reducers/schema';
import dataReducer from '../redux/reducers/data';
import uploadReducer from '../redux/reducers/upload';

export const makeRootReducer = (asyncReducers) => {
  return combineReducers({
    navigation: navigationReducer,
    orientation: orientationReducer,
    menu: menuReducer,
    auth: authReducer,
    interfaceDashboard: interfaceDashboardReducer,
    schema: schemaReducer,
    data: dataReducer,
    upload: uploadReducer,
    ...asyncReducers
  });
};

export const injectReducer = (store, {key, reducer}) => {
  store.asyncReducers[key] = reducer;
  store.replaceReducer(makeRootReducer(store.asyncReducers));
};

export default makeRootReducer;
