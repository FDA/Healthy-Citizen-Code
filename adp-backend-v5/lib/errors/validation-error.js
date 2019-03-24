const AppError = require('./base/app-error');

module.exports = class ValidationError extends AppError {
  constructor(message, data) {
    super(message || 'Validation error', data);
  }
};
