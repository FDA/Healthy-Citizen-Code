import Client from './HTTPClient';

const AuthAPI = {
  auth(login, password) {
    return Client.post('/login', {
      login,
      password
    });
  },
  checkToken(token) {
    return Client.get('/is-authenticated', null, token);
  },
  authNoAlert(login, password) {
    return Client.postNoErrorHandling('/login', {
      login,
      password
    });
  },
  checkTokenNoAlert(token) {
    return Client.getNoErrorHandling('/is-authenticated', null, token);
  }
};

export default AuthAPI;
