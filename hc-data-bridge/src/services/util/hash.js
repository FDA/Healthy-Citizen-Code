const fs = require('fs-extra');
const crypto = require('crypto');

function getFileHashByPath(filePath, algorithm = 'sha1') {
  return new Promise((resolve, reject) => {
    const shasum = crypto.createHash(algorithm);
    try {
      const stream = fs.createReadStream(filePath);
      stream.on('data', data => {
        shasum.update(data);
      });
      // making digest
      stream.on('end', () => {
        const hash = shasum.digest('base64');
        return resolve(hash);
      });
    } catch (error) {
      return reject(new Error('Error occurred during hashing file'));
    }
  });
}


function getFileHashByStream(stream, algorithm = 'sha1') {
  return new Promise((resolve, reject) => {
    const shasum = crypto.createHash(algorithm);
    try {
      stream.on('data', data => shasum.update(data));
      // making digest
      stream.on('end', () => {
        const hash = shasum.digest('base64');
        return resolve(hash);
      });
    } catch (error) {
      return reject(new Error('Error occurred during hashing file'));
    }
  });
}

module.exports = {
  getFileHashByPath,
  getFileHashByStream,
};
