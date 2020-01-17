import Client from './HTTPClient';

const DataAPI = {
  getSchemeData(originalLink, linkParams, allParams) {
    let preparedLink = originalLink;
    linkParams.forEach(linkParam => {
      preparedLink = preparedLink.replace(`:${linkParam}`, allParams[linkParam]);
    });
    return Client.getNoErrorHandling(preparedLink, null, true);
  },
  getUserRecords(userRecordId) {
    return Client.getNoErrorHandling(`/userRecords/${userRecordId}`, null, true);
  },
  getAppModel() {
    return Client.getNoErrorHandling(`/app-model`, null, true);
  },
  getModelCode() {
    return Client.getText(`/app-model-code.min.js`, null, true);
  },
  getNotifications() {
    return Client.getNoErrorHandling('/notifications', null, true);
  },
  get(path) {
    return Client.get(path, null, true);
  },
  add(path, data) {
    return Client.post(path, {data}, true);
  },
  update(path, data) {
    return Client.put(path, {data}, true);
  },
  delete(path) {
    return Client.delete(path, null, true);
  },
  upload(data) {
    return Client.post('/upload', {data}, true);
  },
};

export default DataAPI;
