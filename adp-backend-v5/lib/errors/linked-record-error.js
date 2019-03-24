const AppError = require('./base/app-error');

module.exports = class LinkedRecordError extends AppError {
  constructor(message, data) {
    super(message || 'Invalid linked record', data);
  }
};
