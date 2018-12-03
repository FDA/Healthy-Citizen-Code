const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');
const log = require('log4js').getLogger('lib/file-controller-util');
const jimp = require('jimp');
const mongoose = require('mongoose');
const mime = require('mime');
const Promise = require('bluebird');
const imageMediaTypes = require('../model/model/0_mediaTypes.json').mediaTypes.images;

const imagesTypesMap = _.uniq(imageMediaTypes.map(ext => mime.getType(ext)));
const jimpReadPromisified = Promise.promisify(jimp.read);

module.exports = () => {
  const m = {};

  m.handleUpload = (files, cropParams) =>
    Promise.map(files, file => m.handleSingleFileUpload(file, cropParams));

  m.handleSingleFileUpload = (file, cropParams) =>
    m
      .createFile(file)
      .then(savedFile => m.processImage(savedFile, cropParams))
      .then(savedFile => savedFile.save())
      .then(m.fileToObject);

  m.createFile = (reqFile, uploadDestDir = '../uploads') => {
    const File = mongoose.model('files');
    const newFile = new File(
      {
        originalName: reqFile.name,
        size: reqFile.size,
        mimeType: reqFile.type,
      },
      false
    );

    return Promise.resolve(newFile.save())
      .bind({})
      .then(savedFile => {
        const uploadFolder = Math.random()
          .toString(36)
          .substr(2, 4);
        this.destinationPath = path.resolve(uploadDestDir, uploadFolder, savedFile._id.toString());
        this.relativePath = path.relative(process.cwd(), this.destinationPath);
        this.savedFile = savedFile;

        return fs.move(reqFile.path, this.destinationPath);
      })
      .then(() => {
        // !!! not obvious
        this.savedFile.set('filePath', this.relativePath);
        return this.savedFile;
      });
  };

  m.processImage = (savedFile, cropParams) => {
    if (!isImage(savedFile)) {
      return Promise.resolve(savedFile);
    }

    return Promise.all([m.thumb(savedFile), m.crop(cropParams, savedFile)]).then(() => savedFile);
  };

  m.fileToObject = savedFile => {
    const _doc = savedFile.toObject();

    return {
      name: _doc.originalName,
      size: _doc.size,
      type: _doc.mimeType,
      id: _doc._id,
      cropped: !!_doc.cropped,
    };
  };

  function isImage(file) {
    return imagesTypesMap.includes(file.mimeType);
  }

  m.thumb = savedFile =>
    jimpReadPromisified(savedFile.filePath)
      .then(imageBuffer => {
        const cover = imageBuffer.cover(48, 48);
        const getBufferPromisified = Promise.promisify(cover.getBuffer, { context: cover });
        return getBufferPromisified(savedFile.mimeType);
      })
      .then(coverBuffer => {
        const thumbnailPath = path.resolve(`${savedFile.filePath}_thumbnail`);
        return fs.writeFile(thumbnailPath, coverBuffer);
      })
      .catch(err => {
        log.error(err);
        throw 'Unable to process data';
      });

  m.crop = (cropParams, savedFile) => {
    if (_.isEmpty(cropParams)) {
      return Promise.resolve();
    }
    jimpReadPromisified(savedFile.filePath)
      .then(imageBuffer => {
        const {
          cropImageLeft: left,
          cropImageTop: top,
          cropImageWidth: width,
          cropImageHeight: height,
        } = cropParams;
        const croppedBuffer = imageBuffer.crop(left, top, width, height);
        const getCroppedBufferPromisified = Promise.promisify(croppedBuffer.getBuffer, {
          context: croppedBuffer,
        });
        return getCroppedBufferPromisified(savedFile.mimeType);
      })
      .then(croppedBuffer => {
        // !!! not obvious
        savedFile.set('cropped', true);
        savedFile.set('croppingParameters', cropParams);

        const croppedFilePath = path.resolve(`${savedFile.filePath}_cropped`);
        return fs.writeFile(croppedFilePath, croppedBuffer);
      })
      .catch(err => {
        log.error(err);
        throw 'Unable to process data';
      });
  };

  m.getCropParams = req => {
    const paramsStr = _.get(req, 'body.cropParams');
    if (!paramsStr) {
      return;
    }

    let cropParams;
    try {
      cropParams = JSON.parse(paramsStr);
    } catch (e) {
      throw new Error(`Invalid crop params format: ${paramsStr}`);
    }

    if (!isValidCropParamObj(cropParams)) {
      throw new Error(`Invalid crop params: ${cropParams}`);
    }
    return cropParams;
  };

  function isValidCropParamObj(cropParams) {
    const props = ['cropImageWidth', 'cropImageHeight', 'cropImageTop', 'cropImageLeft'];

    for (let i = 0; i < props.length; i++) {
      const propValue = cropParams[props[i]];
      const isValid = _.isNumber(propValue) && propValue >= 0;

      if (!isValid) {
        return false;
      }
    }

    return true;
  }

  m.updateCrop = cropParams => {
    const File = mongoose.model('files');

    return Promise.resolve(File.findById(cropParams.id))
      .bind({})
      .then(fileRecord => {
        if (!fileRecord) {
          throw new Error(`Unable to find file with id: ${cropParams.id}`);
        }

        this.fileRecord = fileRecord;
        return m.crop(cropParams, fileRecord);
      })
      .then(() => this.fileRecord.save())
      .then(fileRecord => [m.fileToObject(fileRecord)]);
  };

  return m;
};
