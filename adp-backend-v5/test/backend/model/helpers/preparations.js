const reqlib = require('app-root-path').require;
const {auth: {user}} = reqlib('test/backend/test-util');

module.exports = function () {
  // every preparation should return Promise for async code
  // prepareContext is available by calling 'this'
  //
  const m = {
    loadVerifiedCreatorIds: function () {
      return new Promise(resolve => {
        setTimeout(() => {
          const exposedValue = {
            creatorIds: [user._id]
          };
          resolve(exposedValue);
        }, 200);
      });
    }
  };
  return m;
};
