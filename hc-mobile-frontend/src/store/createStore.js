import {applyMiddleware, compose, createStore} from 'redux';
import thunk from 'redux-thunk';
import createLogger from 'redux-logger';
import makeRootReducer from './reducers';

export default (initialState = {}) => {
  // ======================================================
  // Middleware Configuration
  // ======================================================
  const middleware = [thunk];

  // ======================================================
  // Console logger for development
  // ======================================================/
  if (__DEV__) {
    const logger = createLogger();
    middleware.push(logger);
  }

  // ======================================================
  // Store Enhancers
  // ======================================================
  const enhancers = [];

  // ======================================================
  // Store Instantiation and HMR Setup
  // ======================================================
  const store = createStore(
    makeRootReducer(),
    initialState,
    compose(
      applyMiddleware(...middleware),
      ...enhancers
    )
  );
  store.asyncReducers = {};

  return store;
};
