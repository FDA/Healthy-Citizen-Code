import _ from 'lodash';
import apiInterface from '../../api/interface';
import apiDashboard from '../../api/dashboard';
import {parseInterface, parseDashboard} from '../../helpers/parsers';
import {USER_LOGOUT} from '../consts/user';
import {getSpecification} from '../../routes/DashboardItems/components/TemplateGenerator/hcChartService';

// ------------------------------------
// Constants
// ------------------------------------
const INTERFACE_REQUEST = 'INTERFACE_REQUEST';
const INTERFACE_SUCCESS = 'INTERFACE_SUCCESS';
const INTERFACE_FAILURE = 'INTERFACE_FAILURE';

// ------------------------------------
// Action Helpers
// ------------------------------------
const injectSubtypeTemplate = (dashboards, interfaceData) => {
  _.forEach(dashboards, dashboard => {
    if (dashboard.subtype) {
      dashboard.subtypeTemplate = interfaceData.dashboardSubtypes.fields[dashboard.subtype].template;
    }
  })
};

export const getDashboardLink = (interfaceData) => {
  const mainMenuFields = interfaceData.mainMenu.fields;
  // Currently there is only one dashboard. In future model will support multiple dashboards, however it will require new format.
  const dashboardsLinks = _.filter(mainMenuFields, menuField => menuField.type === 'MenuDashboardLink')
    .map(menuField => menuField.link);
  return dashboardsLinks[0];
};

// ------------------------------------
// Actions
// ------------------------------------
export const getInterfaceDashboard = () => async (dispatch, getState) => {
  try {
    dispatch({
      type: INTERFACE_REQUEST
    });

    const interfaceData = (await apiInterface.get()).data;
    const dashboardsLink = getDashboardLink(interfaceData);
    let dashboardList;
    let dashboardData;
    if (dashboardsLink) {
      dashboardList = await apiDashboard.getList(dashboardsLink);
      dashboardData = await apiDashboard.getData(dashboardsLink);
    } else {
      dashboardList = {};
      dashboardData = {};
    }

    const dashboards = parseDashboard(dashboardList.fields, dashboardData);
    injectSubtypeTemplate(dashboards, interfaceData);

    const charts = interfaceData.charts;
    let interfaces = parseInterface(interfaceData.mainMenu.fields);

    // exclude dashboards if there are 0 items
    if (!dashboards || dashboards.length === 0) {
      interfaces = interfaces.filter(i => i.route !== 'Dashboard');
    }

    for (let i = 0; i < dashboards.length; i++) {
      const dashboard = dashboards[i];
      const specification = await getSpecification(charts, dashboard);
      if (specification) {
        dashboard.specification = specification;
      }
    }

    dispatch({
      type: INTERFACE_SUCCESS,
      dashboards,
      interfaces,
      appInfo: interfaceData.app,
      mainMenu: interfaceData.mainMenu,
      pages: interfaceData.pages,
      layout: interfaceData.layout
    });

    return {dashboards, interfaces};
  } catch (error) {
    const errMessage = error.message || 'Something went wrong';
    console.error(errMessage);
    dispatch({
      type: INTERFACE_FAILURE,
      message: errMessage
    });

    throw new Error(errMessage);
  }
};

// ------------------------------------
// Reducer
// ------------------------------------
const initialState = {
  isFetching: false,
  isReceived: false,
  dashboards: [],
  interfaces: [],
  appInfo: {},
  layout: {},
  pages: {}
};

const interfaceDashboardReducer = (state = initialState, action) => {
  switch (action.type) {
    case USER_LOGOUT:
      return ({...initialState});
    case INTERFACE_REQUEST:
      return ({...state, isFetching: true});
    case INTERFACE_SUCCESS:
      return ({
        ...state,
        isFetching: false,
        isReceived: true,
        dashboards: action.dashboards,
        interfaces: action.interfaces,
        appInfo: action.appInfo,
        mainMenu: action.mainMenu,
        layout: action.layout,
        pages: action.pages
      });
    case INTERFACE_FAILURE:
      return ({...state, isFetching: false});
    default:
      return state;
  }
};

export default interfaceDashboardReducer;
