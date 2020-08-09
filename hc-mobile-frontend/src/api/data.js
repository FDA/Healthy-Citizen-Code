import Client from './HTTPClient';

const DataAPI = {
  getPHIs(phiId) {
    return Client.get(`/phis/${phiId}`, null, true);
  },
  getPIIs(piiId) {
    return Client.get(`/piis/${piiId}`, null, true);
  },
  getNotifications() {
    return Client.get('/notifications', null, true);
  },
  add(path, data) {
    return Client.post(path, {data}, true);
  },
  update(path, data) {
    return Client.put(path, {data}, true);
  },
  delete(path) {
    return Client.delete(path, null, true);
  }
};

export default DataAPI;
