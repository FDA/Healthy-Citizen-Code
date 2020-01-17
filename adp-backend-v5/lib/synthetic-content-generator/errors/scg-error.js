const defaultMessage = 'Error occurred during running SCG';

module.exports = class ScgError extends Error {
  constructor(message) {
    super(message || defaultMessage);
  }
};
