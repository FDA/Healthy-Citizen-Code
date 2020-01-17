const AppError = require('./base/app-error');

/**
 * Error should be thrown during user creation if user already exists.
 * @type {module.UserExistsError}
 */
module.exports = class UserExistsError extends AppError {
  constructor(message, data) {
    super(message || 'User already exists', data);
  }
};
