import Client from './HTTPClient';

const InterfaceAPI = {
  get() {
    return Client.get('/interface');
  }
};

export default InterfaceAPI;
