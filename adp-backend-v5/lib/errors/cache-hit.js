const AppError = require('./base/app-error');

/**
 * It can be thrown for early return from promise chain when cache hit occurred.
 * @type {module.CacheHit}
 */
module.exports = class CacheHit extends AppError {
  constructor(message, data) {
    super(message || 'Cache hit', data);
  }
};
