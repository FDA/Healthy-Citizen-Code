const fs = require('fs-extra');
const path = require('path');
const uuidv4 = require('uuid/v4');
const PromiseFtp = require('promise-ftp');
const Promise = require('bluebird');
const exec = Promise.promisify(require('child_process').exec);
const urlParse = require('url-parse');
const sh = require('shelljs');

const { getAxiosProxySettings, getWgetProxyParams } = require('../util/proxy');
// eslint-disable-next-line import/order
const axios = require('axios').create(getAxiosProxySettings());

const wgetProxyParams = getWgetProxyParams();

function downloadFile(url, destPath) {
  destPath = destPath || `${__dirname}/${uuidv4()}`;
  const resolvedFilePath = path.resolve(destPath);
  fs.ensureDirSync(path.dirname(resolvedFilePath));

  if (url.startsWith('ftp')) {
    return downloadFileByFtpUsingWget(url, resolvedFilePath);
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
  await new Promise((resolve, reject) => {
    stream.once('close', resolve);
    stream.once('error', reject);
    stream.pipe(fs.createWriteStream(destPath));
  });
  await ftp.end();
}

async function downloadFileByFtpUsingWget(ftpUrl, destPath) {
  const command = `wget -N '${ftpUrl}' -O '${destPath}' ${wgetProxyParams}`;
  return new Promise((resolve, reject) => {
    exec(command, {}, error => {
      if (error !== null) {
        return reject(error);
      }
      resolve(destPath);
    });
  });
}

// wget settings
const CONNECT_TIMEOUT = 5; // sometimes one of many IPs cannot respond, reduce default 60sec to 5 sec
const TRIES = 5;

/**
 * Required wget installed (most Linux distributions have wget installed by default)
 * @param fileInfos
 * @param parallel
 * @param additionalParams
 * @returns {Promise<*>}
 */
async function downloadUsingWget(fileInfos, parallel = false, additionalParams = '') {
  const promiseFunc = parallel ? Promise.map : Promise.mapSeries;

  return promiseFunc(fileInfos, fileInfo => {
    const { url, destDir } = fileInfo;
    const command = `wget -N '${url}' -P '${destDir}' --connect-timeout ${CONNECT_TIMEOUT} --tries ${TRIES} --progress=dot:mega --continue ${additionalParams}`;
    return new Promise((resolve, reject) => {
      exec(command, {}, error => {
        if (error !== null) {
          console.log(`Unable to download ${url}, file will be skipped. Error: ${error}`);
          return resolve();
        }
        console.log(`Downloaded ${url}`);
        const fileName = url.substr(url.lastIndexOf('/') + 1);
        const filePath = path.resolve(destDir, fileName);
        resolve(filePath);
      });
    });
  }).then(filePaths => filePaths.filter(f => f));
}

/**
 * Url may be an ftp url
 * Required cURL installed (most Linux distributions have cURL installed by default)
 * @param url
 * @returns {Promise<void>}
 */
async function isUrlExists(url) {
  try {
    const response = await exec(`curl -s --head "${url}"`);
    if (!response || /HTTP\/1\.1 [45]/.test(response)) {
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = { downloadFile, downloadUsingWget, isUrlExists };
