const _ = require('lodash');
const crypto = require('crypto');

const algorithm = 'aes-256-ctr';
const GLUE_STRING = '.';

module.exports = ({ CREDENTIALS_PASSWORD }) => {
  const encrypt = (text) => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, CREDENTIALS_PASSWORD, iv);
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);

    return _.map([iv, encrypted], (x) => x.toString('hex')).join(GLUE_STRING);
  };

  const decrypt = (hash) => {
    const [iv, value] = hash.split(GLUE_STRING);
    const decipher = crypto.createDecipheriv(algorithm, CREDENTIALS_PASSWORD, Buffer.from(iv, 'hex'));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(value, 'hex')), decipher.final()]);

    return decrypted.toString();
  };

  return {
    encrypt: CREDENTIALS_PASSWORD ? encrypt : (x) => x,
    decrypt: CREDENTIALS_PASSWORD ? decrypt : (x) => x,
  };
};
