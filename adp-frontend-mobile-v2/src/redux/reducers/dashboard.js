import apiDashboard from '../../api/dashboard';
import {parseDashboard} from '../../helpers/parsers';
import {getDashboardLink} from './interfaceDashboard';
import {USER_LOGOUT} from '../consts/user';

// ------------------------------------
// Constants
// ------------------------------------
const DASHBOARD_REQUEST = 'DASHBOARD_REQUEST';
const DASHBOARD_SUCCESS = 'DASHBOARD_SUCCESS';
const DASHBOARD_FAILURE = 'DASHBOARD_FAILURE';

// ------------------------------------
// Actions
// ------------------------------------
export const getDashboard = () => (dispatch, getState) => {
  dispatch({
    type: DASHBOARD_REQUEST
  });
  const interfaceData = getState()['interfaceDashboard'];
  // TODO: Rework for many dashboard when it will be known. Join with 'interfaceDashboard' reducer.
  const dashboardsLink = getDashboardLink(interfaceData);
  let dashboardList;
  let dashboardData;
  if (dashboardsLink) {
    dashboardList = apiDashboard.getList(dashboardsLink);
    dashboardData = apiDashboard.getData(dashboardsLink);
  } else {
    dashboardList = {data: {}};
    dashboardData = {data: {}};
  }
  return Promise.all([
    dashboardList,
    dashboardData
  ])
    .then(([dashboardList, dashboardData]) => {
        dispatch({
          type: DASHBOARD_SUCCESS,
          dashboard: parseDashboard(dashboardList.data.fields, dashboardData.data),
        });

        return Promise.resolve();
      },
      error => {
        dispatch({
          type: DASHBOARD_FAILURE,
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
    case DASHBOARD_REQUEST:
      return ({...state, isFetching: true});
    case DASHBOARD_SUCCESS:
      return ({...state, isFetching: false, isReceived: true, data: action.dashboard});
    case DASHBOARD_FAILURE:
      return ({...state, isFetching: false});
    default:
      return state;
  }
};

export default interfaceReducer;
