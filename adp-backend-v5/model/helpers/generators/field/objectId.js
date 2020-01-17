const { ObjectID } = require('mongodb');

module.exports = () => {
  return {
    scgObjectID() {
      const time4Bytes = parseInt(Date.now() / 1000, 10).toString(16);
      let result = time4Bytes;
      while (result.length < 24) {
        result += Math.random()
          .toString(16)
          .substr(2);
      }
      return new ObjectID(result.substr(0, 24));
    },
    scgNextObjectID() {
      return new ObjectID();
    },
  };
};
