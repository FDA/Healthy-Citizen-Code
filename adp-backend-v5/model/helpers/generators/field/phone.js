const RandExp = require('randexp');

// eslint-disable-next-line security/detect-unsafe-regex
const phoneNumberRegex = /^[2-9][0-9]{2}[2-9][0-9]{6}$/;
const randExp = new RandExp(phoneNumberRegex);

module.exports = () => {
  return {
    scgPhone() {
      // return chance.phone({ country: "us" }); // does not start with '+1'
      return randExp.gen();
    },
  };
};
