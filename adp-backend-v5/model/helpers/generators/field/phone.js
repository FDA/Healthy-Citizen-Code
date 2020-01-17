const RandExp = require('randexp');

const usPhoneNumberRegex = new RegExp(
  '^(\\+1\\s?)?((\\([2-9][0-9]{2}\\))|[2-9][0-9]{2})[\\s\\-]?[2-9][0-9]{2}[\\s\\-]?[0-9]{4}$'
);
const randExp = new RandExp(usPhoneNumberRegex);

module.exports = () => {
  return {
    scgPhone() {
      // return chance.phone({ country: "us" }); // does not start with '+1'
      return randExp.gen();
    },
  };
};
