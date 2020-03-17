module.exports = {
  ValidationError: require('./validation-error'),
  CallStackError: require('./call-stack-error'),
  AccessError: require('./access-error'),
  UserExistsError: require('./user-exists-error'),
  InvalidTokenError: require('./auth/invalid-token-error'),
  ExpiredTokenError: require('./auth/expired-token-error'),
  LinkedRecordError: require('./linked-record-error'),
};
