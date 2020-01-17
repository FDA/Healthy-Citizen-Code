const bcrypt = require('bcryptjs');

async function hashPassword(password, bcryptRounds = 10) {
  const salt = await bcrypt.genSalt(bcryptRounds);
  return bcrypt.hash(password, salt);
}

async function comparePassword(plainPassword, hash) {
  return bcrypt.compare(plainPassword, hash);
}

const bcryptHashRegex = /^\$2[ayb]\$.{56}$/;

module.exports = {
  hashPassword,
  comparePassword,
  bcryptHashRegex,
};
