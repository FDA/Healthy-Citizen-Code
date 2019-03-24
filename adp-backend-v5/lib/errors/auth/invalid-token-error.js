const AppError = require('../base/app-error');

/**
 * Error should be thrown when user cannot login into system (for example due to incorrect JWT token)
 * It's not related with permissions (See AccessError)
 * @type {module.InvalidTokenError}
 */
module.exports = class InvalidTokenError extends AppError {
  constructor(message, data) {
    super(message || 'Not authorized', data);
  }
};
