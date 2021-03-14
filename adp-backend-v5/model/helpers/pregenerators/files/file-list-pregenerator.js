const path = require('path');
const _ = require('lodash');
const mime = require('mime');
const fs = require('fs-extra');
const { globSyncAsciiOrder } = require('../../../../lib/util/glob');

function getFilesFromPaths(files) {
  return _.castArray(files).map((f) => {
    const filePath = path.resolve(f);
    const fileName = path.basename(filePath);
    return {
      path: filePath,
      name: fileName,
      type: mime.getType(filePath),
      size: fs.statSync(filePath).size,
    };
  });
}

const filesDirPath = path.join(__dirname, 'file-examples');

const audio = getFilesFromPaths(globSyncAsciiOrder(`${filesDirPath}/audio/*`));
const documents = getFilesFromPaths(globSyncAsciiOrder(`${filesDirPath}/documents/*`));
const images = getFilesFromPaths(globSyncAsciiOrder(`${filesDirPath}/images/*`));
const misc = getFilesFromPaths(globSyncAsciiOrder(`${filesDirPath}/misc/*`));
const video = getFilesFromPaths(globSyncAsciiOrder(`${filesDirPath}/video/*`));
const files = [...audio, ...documents, ...images, ...misc, ...video];

const fileList = {
  audio,
  documents,
  images,
  misc,
  video,
  files,
};

function fileListPregenerator({ paramsForGeneratorFiles }) {
  paramsForGeneratorFiles.fileList = fileList;
}

module.exports = {
  fileListPregenerator,
};
