const path = require('path');
const { getFilesFromPaths } = require('../../../../lib/file-controller-util')();
const { globSyncAsciiOrder } = require('../../../../lib/util/glob');

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
