const reqlib = require('app-root-path').require;

const {
  auth: { user },
} = reqlib('test/test-util');

module.exports = function() {
  // every preparation should return Promise for async code
  // inlineContext is available by calling 'this'
  //
  const m = {
    loadVerifiedCreatorIds() {
      return Promise.resolve({
        creatorIds: [user._id],
      });
    },
    async functionPreparingDataToBeUsedInWhere() {
      return 42;
    },
  };
  return m;
};
