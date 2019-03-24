const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const uuidv4 = require('uuid/v4');
const PromiseFtp = require('promise-ftp');
const Promise = require('bluebird');
const urlParse = require('url-parse');
const sh = require('shelljs');

function downloadFile(url, destPath) {
  destPath = destPath || `${__dirname}/${uuidv4()}`;
  const resolvedFilePath = path.resolve(destPath);
  fs.ensureDirSync(path.dirname(resolvedFilePath));

  if (url.startsWith('ftp')) {
    return downloadFileByFtp(url, resolvedFilePath);
  }
  return downloadFileByHttp(url, resolvedFilePath);
}

async function downloadFileByHttp(url, filepath) {
  // axios download with response type "stream" (appropriate for large files i.e. images, docs, etc)
  const response = await axios({
    method: 'GET',
    url,
    responseType: 'stream',
  });
  const stream = response.data;

  return new Promise((resolve, reject) => {
    stream.on('end', () => resolve());
    stream.on('error', () => reject());
    // pipe the result stream into a file on disc
    stream.pipe(fs.createWriteStream(filepath));
  });
}

async function downloadFileByFtp(ftpUrl, destPath) {
  const ftp = new PromiseFtp();
  const { host, username, password, pathname } = urlParse(ftpUrl);

  try {
    await ftp.connect({ host, user: username, password });
  } catch (e) {
    throw new Error(`Cannot connect to FTP by url: ${ftpUrl}. ${e.stack}`);
  }

  const stream = await ftp.get(pathname);
  await new Promise(function(resolve, reject) {
    stream.once('close', resolve);
    stream.once('error', reject);
    stream.pipe(fs.createWriteStream(destPath));
  });
  await ftp.end();
}

// wget settings
const CONNECT_TIMEOUT = 5; // sometimes one of many IPs cannot respond, reduce default 60sec to 5 sec
const TRIES = 5;

async function downloadUsingWget(fileInfos, parallel = false) {
  const promiseFunc = parallel ? Promise.map : Promise.mapSeries;

  return promiseFunc(fileInfos, fileInfo => {
    const { url, destDir } = fileInfo;
    const command = `wget -N '${url}' -P '${destDir}' --connect-timeout ${CONNECT_TIMEOUT} --tries ${TRIES} --progress=dot:mega`;
    return new Promise((resolve, reject) => {
      sh.exec(command, (code, stdout, stderr) => {
        if (code !== 0) {
          console.log(`Unable to download ${url}, file will be skipped`);
          return resolve();
        }
        const fileName = url.substr(url.lastIndexOf('/') + 1);
        const filePath = path.resolve(destDir, fileName);
        resolve(filePath);
      });
    });
  })
    .then(filePaths => filePaths.filter(f => f));
}

module.exports = { downloadFile, downloadFileByHttp, downloadFileByFtp, downloadUsingWget };
