const RandExp = require('randexp');

const passwordRegExp = new RegExp('^(?=.*\\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%!&^*_-]).{8,32}$');
const randExp = new RandExp(passwordRegExp);

/**
 * Lookaheads issue: https://github.com/fent/randexp.js/issues/18
 * @returns {string}
 */
function generatePasswordWithValidation() {
  let password = randExp.gen();
  while (!passwordRegExp.test(password)) {
    password = randExp.gen();
  }
  return password;
}

module.exports = () => {
  return {
    scgPassword() {
      return generatePasswordWithValidation();
    },
  };
};
