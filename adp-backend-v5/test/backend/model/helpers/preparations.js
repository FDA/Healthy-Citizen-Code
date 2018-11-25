const reqlib = require('app-root-path').require;

const {
  auth: { user },
} = reqlib('test/backend/test-util');

module.exports = function() {
  // every preparation should return Promise for async code
  // prepareContext is available by calling 'this'
  //
  const m = {
    loadVerifiedCreatorIds() {
      return Promise.resolve({
        creatorIds: [user._id],
      });
    },
  };
  return m;
};
