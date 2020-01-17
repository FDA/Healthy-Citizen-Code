const _ = require('lodash');
const mongoose = require('mongoose');

module.exports = ({ ScgError }) => {
  return {
    /**
     * Used to generate link on users record for field 'creator'.
     */
    async scgCreator() {
      const { users = [] } = this.params;
      const pipeline = [{ $sample: { size: 1 } }, { $project: { _id: 1 } }];
      if (_.isArray(users) && users.length) {
        pipeline.unshift({ $match: { login: { $in: users } } });
      }
      const docs = await mongoose
        .model('users')
        .aggregate(pipeline)
        .exec();

      if (!docs.length) {
        throw new ScgError(`No users found for function 'scgCreator' with param 'users'=${users}`);
      }
      return docs[0]._id;
    },
  };
};
