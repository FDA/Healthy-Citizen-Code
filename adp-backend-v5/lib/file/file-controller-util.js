const crypto = require('crypto');
const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');
const jimp = require('jimp');
const mime = require('mime');
const Promise = require('bluebird');
const { ObjectId } = require('mongodb');

const imageMediaTypes = require('../../model/model/0_mediaTypes.json').mediaTypes.images;
const GraphQlContext = require('../request-context/graphql/GraphQlContext');
const { ValidationError } = require('../errors');

const imagesTypesMap = _.uniq(imageMediaTypes.map((ext) => mime.getType(ext)));

module.exports = (appLib) => {
  const m = {};
  const { filesCollectionName, uploadDir: defaultUploadDir } = require('./constants');
  const File = appLib.db.collection(filesCollectionName);

  /**
   * Wrapper that casts file structure given from middleware (like express-fileupload, multer, etc)
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

  m.handleUpload = ({ files, owner, cropParams, uploadDir = defaultUploadDir }) => {
    const castedFiles = castFiles(files);
    // using mapSeries to avoid "ParallelSaveError": Can't save() the same doc multiple times in parallel
    return Promise.mapSeries(castedFiles, (file) => m.handleSingleFileUpload({ file, owner, cropParams, uploadDir }));
  };

  m.handleSingleFileUpload = async ({ file, owner, cropParams, uploadDir = defaultUploadDir }) => {
    const hash = await m.getFileHash(file.tempFilePath || file.path);
    const fileRecord = await m.createFile({ file, hash, owner, uploadDir });
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

  m.getThumbnailPath = function (fullFilePath) {
    return path.resolve(`${fullFilePath}_thumbnail`);
  };

  m.getCroppedPath = function (fullFilePath) {
    return path.resolve(`${fullFilePath}_cropped`);
  };

  /**
   * Removes file from disk and files collection .
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
    isImage(record) && pathsToRemove.push(m.getThumbnailPath(fullFilePath));
    cropped && pathsToRemove.push(m.getCroppedPath(fullFilePath));

    return Promise.all([
      File.hookQuery('deleteOne', { _id: ObjectId(fileId) }, { checkKeys: false }),
      Promise.map(pathsToRemove, (p) => fs.unlink(p)),
    ]);
  };

  m.generateDestinationFilePath = ({ docId = ObjectId(), uploadDir = defaultUploadDir }) => {
    const uploadFolder = Math.random().toString(36).substr(2, 4);
    return path.resolve(uploadDir, uploadFolder, docId.toString());
  };

  m.getRelativePath = (absolutePath) => path.relative(process.cwd(), absolutePath);

  m.createFile = async ({ file, hash, owner, uploadDir = defaultUploadDir }) => {
    const ownerLogin = _.get(owner, 'login');
    let userLookup = null;
    if (ownerLogin) {
      userLookup = {
        table: 'users',
        label: owner.login,
        _id: owner._id,
      };
    }

    const docId = ObjectId();
    const destinationPath = m.generateDestinationFilePath({ docId, uploadDir });
    const relativePath = m.getRelativePath(destinationPath);
    if (file.path) {
      await fs.copy(file.path, destinationPath);
    } else if (file.tempFilePath) {
      await fs.move(file.tempFilePath, destinationPath);
    }

    const now = new Date();
    return {
      _id: docId,
      originalName: file.name,
      size: file.size,
      mimeType: file.type,
      creator: userLookup,
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

  m.fileToObject = (savedFile) => ({
    name: savedFile.originalName,
    size: savedFile.size,
    type: savedFile.mimeType,
    id: savedFile._id,
    cropped: !!savedFile.cropped,
    hash: savedFile.hash,
  });

  function isImage(file) {
    return imagesTypesMap.includes(file.mimeType);
  }

  m.thumb = async (fileRecord) => {
    const imageBuffer = await jimp.read(fileRecord.filePath);
    const cover = imageBuffer.cover(48, 48);
    const coverBuffer = await cover.getBufferAsync(fileRecord.mimeType);
    const thumbnailPath = m.getThumbnailPath(fileRecord.filePath);
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

    const croppedFilePath = m.getCroppedPath(fileRecord.filePath);
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

  /** Streams file to browser */
  m.sendFile = ({ attachment, fullPath, mimeType, originalName, res, next }) => {
    res.writeHead(200, {
      'Content-Type': mimeType,
      'Content-Disposition': attachment ? `attachment; filename=${originalName}` : 'inline',
    });
    const stream = fs.createReadStream(fullPath);
    stream.on('end', next);
    stream.pipe(res);
  };

  m.FILE_TYPES = {
    ASIS: 'ASIS',
    CROPPED: 'CROPPED',
    THUMBNAIL: 'THUMBNAIL',
  };

  m.parseFileType = (type) => {
    if (!type) {
      return m.FILE_TYPES.ASIS;
    }
    if (!_.isString(type)) {
      return;
    }
    return m.FILE_TYPES[type.toUpperCase()];
  };

  m.getFileInfo = async (fileRecord, fileType) => {
    const initFilePath = path.resolve(fileRecord.filePath);
    if (fileType === m.FILE_TYPES.ASIS) {
      return { filePath: initFilePath, mimeType: fileRecord.mimeType };
    }

    if (fileType === m.FILE_TYPES.CROPPED) {
      return { filePath: m.getCroppedPath(initFilePath), mimeType: fileRecord.mimeType };
    }

    if (fileType === m.FILE_TYPES.THUMBNAIL) {
      const thumbnailPath = m.getThumbnailPath(initFilePath);
      if (await fs.pathExists(thumbnailPath)) {
        return { filePath: thumbnailPath, mimeType: fileRecord.mimeType };
      }

      const mimeType = (fileRecord.mimeType || '').replace(/\//g, '-');
      const thumbnailByMimePath = path.resolve(__dirname, `../../model/public/default-thumbnails/${mimeType}.png`);
      if (await fs.pathExists(thumbnailByMimePath)) {
        return { filePath: thumbnailByMimePath, mimeType: 'image/png' };
      }

      const defaultThumbnail = path.resolve(__dirname, '../../model/public/default-thumbnails/default.png');
      if (await fs.pathExists(defaultThumbnail)) {
        return { filePath: defaultThumbnail, mimeType: 'image/png' };
      }
      throw new ValidationError('No thumbnail available');
    }

    throw new ValidationError(`Invalid file type ${fileType}`);
  };

  m.getUserLinkId = function (req) {
    return req.session.id;
  };

  m.getFileHandlingErrors = async (req, fileId) => {
    if (!fileId) {
      throw new ValidationError(`File id must be specified`);
    }
    if (!ObjectId.isValid(fileId)) {
      throw new ValidationError(`Invalid file id`);
    }

    let record;
    try {
      const context = await new GraphQlContext(appLib, req, filesCollectionName, {}).init();
      context.mongoParams = { conditions: { _id: ObjectId(fileId) } };
      const { items } = await appLib.controllerUtil.getItems(context);
      record = items[0];
    } catch (e) {
      throw new ValidationError('Error occurred while retrieving the file');
    }

    if (!record) {
      throw new ValidationError('File not found');
    }
    return record;
  };

  return m;
};
