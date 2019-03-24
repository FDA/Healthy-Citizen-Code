const crypto = require('crypto');
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

  /**
   * Wrapper that cast file structure given from middleware (like express-fileupload, multer, etc)
   * @param files
   * @returns {undefined}
   */
  function castFiles(files) {
    return _.map(files, f => ({
      path: f.tempFilePath,
      type: f.mimetype,
      name: f.name,
      size: f.size,
    }));
  }

  m.handleUpload = (files, owner, cropParams) => {
    const castedFiles = castFiles(files);
    // using mapSeries to avoid "ParallelSaveError": Can't save() the same doc multiple times in parallel
    return Promise.mapSeries(castedFiles, file =>
      m.handleSingleFileUpload(file, owner, cropParams)
    );
  };

  m.handleSingleFileUpload = (file, owner, cropParams) =>
    m
      .getFileHash(file.path)
      .then(hash => m.createFile(file, hash, owner))
      .then(savedFile => m.processImage(savedFile, cropParams))
      .then(savedFile => savedFile.save())
      .then(m.fileToObject);

  /* eslint-disable promise/avoid-new */
  m.getFileHash = (filePath, algorithm = 'sha1') =>
    new Promise((resolve, reject) => {
      const shasum = crypto.createHash(algorithm);
      try {
        const stream = fs.createReadStream(filePath);
        stream.on('data', data => {
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

  m.createFile = (reqFile, hash, owner, uploadDestDir = '../uploads') => {
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
      hash: _doc.hash,
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
