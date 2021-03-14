const _ = require('lodash');

module.exports = ({ ScgError, db }) => {
  return {
    /** Used to generate link on users record for field 'creator' */
    async scgCreator() {
      const { users = [] } = this.params;
      const pipeline = [{ $sample: { size: 1 } }, { $project: { _id: 1, login: 1 } }];
      if (_.isArray(users) && users.length) {
        pipeline.unshift({ $match: { login: { $in: users } } });
      }

      const docs = await db.collection('users').aggregate(pipeline).toArray();
      if (!docs.length) {
        throw new ScgError(`No users found for function 'scgCreator' with param 'users'=${users}`);
      }
      const user = docs[0];

      return {
        _id: user._id,
        table: 'users',
        label: user.login,
      };
    },
  };
};
