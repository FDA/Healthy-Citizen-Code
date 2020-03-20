const AppError = require('./base/app-error');

/**
 * Error should be thrown when user has not enough permissions to perform operation.
 * @type {module.AccessError}
 */
module.exports = class QueueError extends AppError {
  constructor(message, data) {
    super(message || 'Queue error', data);
  }
};
