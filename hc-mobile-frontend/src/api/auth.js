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
  }
};

export default AuthAPI;
