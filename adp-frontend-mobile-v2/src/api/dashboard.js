import Client from './HTTPClient';

const DashboardAPI = {
  getList(dashboardId) {
    return Client.get(`/dashboards/${dashboardId}`, null, true);
  },
  getData(dashboardId) {
    return Client.get(`/dashboards/${dashboardId}/data`, null, true);
  }
};

export default DashboardAPI;
