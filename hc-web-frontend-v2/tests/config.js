var appConfig = require('../api_config.json');

module.exports = {
  resourceUrl: appConfig.CONSTANTS.hostUrl,
  apiUrl: appConfig.CONSTANTS.apiUrl,

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
