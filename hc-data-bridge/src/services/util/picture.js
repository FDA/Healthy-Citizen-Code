const Promise = require('bluebird');
const fs = require('fs-extra');
const jimp = require('jimp');

async function thumb(srcFilePath, mimeType, destThumbFilePath) {
  const imageBuffer = await jimp.read(srcFilePath);
  const cover = imageBuffer.cover(48, 48);
  const getBufferPromisified = Promise.promisify(cover.getBuffer, { context: cover });
  const coverBuffer = await getBufferPromisified(mimeType);
  return fs.writeFile(destThumbFilePath, coverBuffer);
}

module.exports = {
  thumb,
};
