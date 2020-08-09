import Client from './HTTPClient';

const DashboardAPI = {
  getList() {
    return Client.get('/dashboards/mainDashboard');
  },
  getData() {
    return Client.get('/dashboards/mainDashboard/data', null, true);
  }
};

export default DashboardAPI;
