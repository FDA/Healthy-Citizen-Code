const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

const downloadFile = (url, filepath) => {
  const resolvedFilepath = path.resolve(filepath);
  fs.ensureDirSync(path.dirname(resolvedFilepath));

  // axios image download with response type "stream"
  return axios({
    method: 'GET',
    url,
    responseType: 'stream',
  })
    .then((response) => {
      // pipe the result stream into a file on disc
      response.data.pipe(fs.createWriteStream(resolvedFilepath));

      return new Promise((resolve, reject) => {
        response.data.on('end', () => resolve());
        response.data.on('error', () => reject());
      });
    });
};

module.exports = { downloadFile };
