const AppError = require('./base/app-error');

/**
 * Error should be thrown when user has not enough permissions to perform operation.
 * @type {module.AccessError}
 */
module.exports = class AccessError extends AppError {
  constructor(message, data) {
    super(message || 'Not enough permissions to perform operation', data);
  }
};
