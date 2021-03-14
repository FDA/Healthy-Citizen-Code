const crypto = require('crypto');
const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');
const jimp = require('jimp');
const mime = require('mime');
const Promise = require('bluebird');
const { ObjectId } = require('mongodb');
const imageMediaTypes = require('../model/model/0_mediaTypes.json').mediaTypes.images;

const imagesTypesMap = _.uniq(imageMediaTypes.map((ext) => mime.getType(ext)));
const DEFAULT_UPLOAD_DIR = '../uploads';

module.exports = (db) => {
  const m = {};
  const File = db.collection('files');

  m.DEFAULT_UPLOAD_DIR = DEFAULT_UPLOAD_DIR;

  /**
   * Wrapper that cast file structure given from middleware (like express-fileupload, multer, etc)
   * @param files
   * @returns {undefined}
   */
  function castFiles(files) {
    return _.castArray(files).map((f) => ({
      tempFilePath: f.tempFilePath, // tempFilePath is moved
      path: f.path, // path is copied, original file is not touched
      type: f.mimetype || f.type,
      name: f.name,
      size: f.size,
    }));
  }

  m.handleUpload = (files, owner, cropParams, uploadDir = DEFAULT_UPLOAD_DIR) => {
    const castedFiles = castFiles(files);
    // using mapSeries to avoid "ParallelSaveError": Can't save() the same doc multiple times in parallel
    return Promise.mapSeries(castedFiles, (file) => m.handleSingleFileUpload(file, owner, cropParams, uploadDir));
  };

  m.handleSingleFileUpload = async (file, owner, cropParams, uploadDir) => {
    const hash = await m.getFileHash(file.tempFilePath || file.path);
    const fileRecord = await m.createFile(file, hash, owner, uploadDir);
    const fileRecordWithProcessedImage = await m.processImage(fileRecord, cropParams);
    const { record } = await File.hookQuery('insertOne', fileRecordWithProcessedImage, { checkKeys: false });
    return m.fileToObject(record);
  };

  /* eslint-disable promise/avoid-new */
  m.getFileHash = (filePath, algorithm = 'sha1') =>
    new Promise((resolve, reject) => {
      const shasum = crypto.createHash(algorithm);
      try {
        const stream = fs.createReadStream(filePath);
        stream.on('data', (data) => {
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
  /* eslint-enable promise/avoid-new */

  /**
   * Removes file from disk and 'files' collection .
   * @param fileId
   * @returns {*}
   */
  m.removeFile = async (fileId) => {
    const { record } = await File.hookQuery('findOne', { _id: ObjectId(fileId) });
    if (!record) {
      return;
    }
    const { filePath, cropped } = record;
    const fullFilePath = path.resolve(filePath);
    const pathsToRemove = [fullFilePath];
    isImage(record) && pathsToRemove.push(`${fullFilePath}_thumbnail`);
    cropped && pathsToRemove.push(`${fullFilePath}_cropped`);

    return Promise.all([
      File.hookQuery('removeOne', { _id: ObjectId(fileId) }, { checkKeys: false }),
      Promise.map(pathsToRemove, (p) => fs.unlink(p)),
    ]);
  };

  m.createFile = async (reqFile, hash, owner, uploadDir) => {
    const ownerLogin = _.get(owner, 'login');
    let userLookup = null;
    if (ownerLogin) {
      userLookup = {
        table: 'users',
        label: owner.login,
        _id: owner.id,
      };
    }

    const docId = ObjectId();
    const uploadFolder = Math.random().toString(36).substr(2, 4);
    const destinationPath = path.resolve(uploadDir, uploadFolder, docId.toString());
    const relativePath = path.relative(process.cwd(), destinationPath);
    if (reqFile.path) {
      await fs.copy(reqFile.path, destinationPath);
    } else if (reqFile.tempFilePath) {
      await fs.move(reqFile.tempFilePath, destinationPath);
    }

    const now = new Date();
    return {
      _id: docId,
      originalName: reqFile.name,
      size: reqFile.size,
      mimeType: reqFile.type,
      user: userLookup,
      hash,
      filePath: relativePath,
      deletedAt: new Date(0),
      createdAt: now,
      updatedAt: now,
    };
  };

  m.processImage = async (fileRecord, cropParams) => {
    if (!isImage(fileRecord)) {
      return fileRecord;
    }

    await Promise.all([m.thumb(fileRecord), m.crop(cropParams, fileRecord)]);
    return fileRecord;
  };

  m.fileToObject = (savedFile) => {
    return {
      name: savedFile.originalName,
      size: savedFile.size,
      type: savedFile.mimeType,
      id: savedFile._id,
      cropped: !!savedFile.cropped,
      hash: savedFile.hash,
    };
  };

  function isImage(file) {
    return imagesTypesMap.includes(file.mimeType);
  }

  m.thumb = async (fileRecord) => {
    const imageBuffer = await jimp.read(fileRecord.filePath);
    const cover = imageBuffer.cover(48, 48);
    const coverBuffer = await cover.getBufferAsync(fileRecord.mimeType);
    const thumbnailPath = path.resolve(`${fileRecord.filePath}_thumbnail`);
    await fs.writeFile(thumbnailPath, coverBuffer);
  };

  m.crop = async (cropParams, fileRecord) => {
    if (_.isEmpty(cropParams)) {
      return;
    }
    const imageBuffer = await jimp.read(fileRecord.filePath);
    const { cropImageLeft: left, cropImageTop: top, cropImageWidth: width, cropImageHeight: height } = cropParams;
    const crop = imageBuffer.crop(left, top, width, height);
    const croppedBuffer = await crop.getBufferAsync(fileRecord.mimeType);
    fileRecord.cropped = true;
    fileRecord.croppingParameters = cropParams;

    const croppedFilePath = path.resolve(`${fileRecord.filePath}_cropped`);
    await fs.writeFile(croppedFilePath, croppedBuffer);
  };

  m.getCropParams = (req) => {
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

  m.updateCrop = async (cropParams) => {
    const conditions = { _id: ObjectId(cropParams.id) };
    const { record } = await File.hookQuery('findOne', conditions);
    if (!record) {
      throw new Error(`Unable to find file with id: ${cropParams.id}`);
    }

    await m.crop(cropParams, record);
    await File.hookQuery('replaceOne', conditions, record, { checkKeys: false });
    return [m.fileToObject(record)];
  };

  return m;
};
