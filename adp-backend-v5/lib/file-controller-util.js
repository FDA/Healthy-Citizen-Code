const crypto = require('crypto');
const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');
const jimp = require('jimp');
const mongoose = require('mongoose');
const mime = require('mime');
const Promise = require('bluebird');
const imageMediaTypes = require('../model/model/0_mediaTypes.json').mediaTypes.images;

const imagesTypesMap = _.uniq(imageMediaTypes.map((ext) => mime.getType(ext)));
const DEFAULT_UPLOAD_DIR = '../uploads';

module.exports = () => {
  const m = {};

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

  m.getFilesFromPaths = (files) => {
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
  };

  m.handleUpload = (files, owner, cropParams, uploadDir = DEFAULT_UPLOAD_DIR) => {
    const castedFiles = castFiles(files);
    // using mapSeries to avoid "ParallelSaveError": Can't save() the same doc multiple times in parallel
    return Promise.mapSeries(castedFiles, (file) => m.handleSingleFileUpload(file, owner, cropParams, uploadDir));
  };

  m.handleSingleFileUpload = async (file, owner, cropParams, uploadDir) => {
    const hash = await m.getFileHash(file.tempFilePath || file.path);
    const savedFile = await m.createFile(file, hash, owner, uploadDir);
    const fileWithProcessedImage = await m.processImage(savedFile, cropParams);
    const fileModel = await fileWithProcessedImage.save();
    return m.fileToObject(fileModel);
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
    const File = mongoose.model('files');
    const file = await File.findById(fileId);
    if (!file) {
      return;
    }
    const { filePath, cropped } = file;
    const fullFilePath = path.resolve(filePath);
    const pathsToRemove = [fullFilePath];
    isImage(file) && pathsToRemove.push(`${fullFilePath}_thumbnail`);
    cropped && pathsToRemove.push(`${fullFilePath}_cropped`);

    return Promise.all([File.findByIdAndRemove(fileId), Promise.map(pathsToRemove, (p) => fs.unlink(p))]);
  };

  m.createFile = async (reqFile, hash, owner, uploadDir) => {
    const File = mongoose.model('files');

    const ownerLogin = _.get(owner, 'login');
    let userLookup = null;
    if (ownerLogin) {
      userLookup = {
        table: 'users',
        label: owner.login,
        _id: owner.id,
      };
    }

    const newFile = new File(
      {
        originalName: reqFile.name,
        size: reqFile.size,
        mimeType: reqFile.type,
        user: userLookup,
        hash,
      },
      false
    );

    const savedFile = await newFile.save();
    const uploadFolder = Math.random().toString(36).substr(2, 4);
    const destinationPath = path.resolve(uploadDir, uploadFolder, savedFile._id.toString());
    const relativePath = path.relative(process.cwd(), destinationPath);
    if (reqFile.path) {
      await fs.copy(reqFile.path, destinationPath);
    } else if (reqFile.tempFilePath) {
      await fs.move(reqFile.tempFilePath, destinationPath);
    }
    // !!! not obvious
    savedFile.set('filePath', relativePath);
    return savedFile;
  };

  m.processImage = async (savedFile, cropParams) => {
    if (!isImage(savedFile)) {
      return savedFile;
    }

    await Promise.all([m.thumb(savedFile), m.crop(cropParams, savedFile)]);
    return savedFile;
  };

  m.fileToObject = (savedFile) => {
    const _doc = savedFile.toObject();

    return {
      name: _doc.originalName,
      size: _doc.size,
      type: _doc.mimeType,
      id: _doc._id,
      cropped: !!_doc.cropped,
      hash: _doc.hash,
    };
  };

  function isImage(file) {
    return imagesTypesMap.includes(file.mimeType);
  }

  m.thumb = async (savedFile) => {
    const imageBuffer = await jimp.read(savedFile.filePath);
    const cover = imageBuffer.cover(48, 48);
    const coverBuffer = await cover.getBufferAsync(savedFile.mimeType);
    const thumbnailPath = path.resolve(`${savedFile.filePath}_thumbnail`);
    await fs.writeFile(thumbnailPath, coverBuffer);
  };

  m.crop = async (cropParams, savedFile) => {
    if (_.isEmpty(cropParams)) {
      return;
    }
    const imageBuffer = await jimp.read(savedFile.filePath);
    const { cropImageLeft: left, cropImageTop: top, cropImageWidth: width, cropImageHeight: height } = cropParams;
    const crop = imageBuffer.crop(left, top, width, height);
    const croppedBuffer = await crop.getBufferAsync(savedFile.mimeType);
    // !!! not obvious
    savedFile.set('cropped', true);
    savedFile.set('croppingParameters', cropParams);

    const croppedFilePath = path.resolve(`${savedFile.filePath}_cropped`);
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
    const File = mongoose.model('files');

    const fileRecord = await File.findById(cropParams.id);
    if (!fileRecord) {
      throw new Error(`Unable to find file with id: ${cropParams.id}`);
    }

    await m.crop(cropParams, fileRecord);
    const savedFile = await fileRecord.save();
    return [m.fileToObject(savedFile)];
  };

  return m;
};
