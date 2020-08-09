import Client from './HTTPClient';

const SchemaAPI = {
  getSchema() {
    return Client.get('/schemas');
  },
  getFieldTypes() {
    return Client.get('/lists');
  }
};

export default SchemaAPI;
