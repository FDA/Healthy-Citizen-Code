const path = require('path');
const glob = require('glob');
const { getFilesFromPaths } = require('../../../../lib/file-controller-util')();

const filesDirPath = path.join(__dirname, 'file-examples');

const audio = getFilesFromPaths(glob.sync(`${filesDirPath}/audio/*`));
const documents = getFilesFromPaths(glob.sync(`${filesDirPath}/documents/*`));
const images = getFilesFromPaths(glob.sync(`${filesDirPath}/images/*`));
const misc = getFilesFromPaths(glob.sync(`${filesDirPath}/misc/*`));
const video = getFilesFromPaths(glob.sync(`${filesDirPath}/video/*`));
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
