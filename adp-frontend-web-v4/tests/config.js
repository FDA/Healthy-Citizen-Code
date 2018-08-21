var appConfig = require('../api_config.json');

module.exports = {
  resourceUrl: appConfig.APP_CONFIG.hostUrl,
  apiUrl: appConfig.APP_CONFIG.apiUrl,

  testUser: {
    login: 'test_user',
    email: 'test@test.com',
    password: 'qweqwe123123'
  },

  fieldsData: {
    email: {
      valid: 'test@mail.com',
      invalid: ['test@', 'test', 'test@ee']
    }
  }
}
