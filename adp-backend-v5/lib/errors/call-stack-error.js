const AppError = require('./base/app-error');

// Used for limiting number of calls of recursive functions
module.exports = class CallStackError extends AppError {
  constructor(message, data) {
    super(message || 'The maximum number of recursive calls has been reached.', data);
  }
};
