const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');
const log = require('log4js').getLogger('lib/file-controller');
const mongoose = require('mongoose');
const { updateCrop, handleUpload, getCropParams } = require('./file-controller-util')();

module.exports = appLib => {
  const m = {};
  const mainController = require('./default-controller')(appLib);

  /**
   * Test method for uploading files, will be replaced with methods specified for each field
   * TODO: improve this method to handle file uploads securely and assign them to users (so nobody else can see other person's uploads
   * @param req
   * @param res
   * @param next
   */
  m.upload = (req, res, next) => {
    const onSuccess = files => {
      res.json({ success: true, data: files });
      next();
    };

    const onError = err => {
      log.error(err);
      res.json({ success: false, message: 'Error occurred while uploading files' });
    };

    let cropParams;
    try {
      cropParams = getCropParams(req);
    } catch (e) {
      return res.json({ success: false, message: e.message });
    }

    // image crop update
    // todo: move to separated endpoint
    if (_.isEmpty(req.files) && !_.isEmpty(cropParams)) {
      return updateCrop(req)
        .then(onSuccess)
        .catch(onError);
    }

    if (_.isEmpty(req.files)) {
      return mainController.error(req, res, next, 'No file or data received');
    }

    // file creation
    log.trace(`Accepting uploaded files: ${JSON.stringify(req.files, null, 4)}`);

    const files = Object.values(req.files);
    handleUpload(files, req.user, cropParams)
      .then(onSuccess)
      .catch(onError);
  };

  function getFile(cropped, req, res, next) {
    const File = mongoose.model('files');

    Promise.resolve(File.findById(req.query.id))
      .bind({})
      .then(data => {
        if (!data) {
          return mainController.error(req, res, next, 'File not found in the database'); // TODO: should I return 404?
        }

        this.data = data;
        const initFilePath = path.resolve(data.filePath);
        this.requestedFilePath = cropped ? `${initFilePath}_cropped` : initFilePath;

        return fs.pathExists(this.requestedFilePath);
      })
      .then(exists => {
        if (exists) {
          return sendFile(this.requestedFilePath, this.data, req, res, next);
        }
        mainController.error(req, res, next, 'File not found on the server'); // TODO: should I return 404?
      })
      .catch(err => {
        mainController.error(
          req,
          res,
          next,
          err.message,
          'Error occurred while retrieving the file'
        );
      });
  }

  /**
   * Streams file to browser
   * @param req
   * @param res
   * @param next
   */
  m.sendFile = sendFile;
  function sendFile(fullPath, data, req, res, next) {
    res.writeHead(200, {
      'Content-Type': data.mimeType,
      'Content-Disposition': req.url.startsWith('/download')
        ? `attachment; filename=${data.originalName}`
        : 'inline',
      // "Content-Length": data.size
    });
    const stream = fs.createReadStream(fullPath);
    stream.on('end', next);
    stream.pipe(res);
  }

  /**
   * Returns file uploaded by a user
   * @param req
   * @param res
   * @param next
   */
  m.getFile = (req, res, next) => {
    getFile(false, req, res, next);
  };

  /**
   * Returns cropped version of the file
   * @param req
   * @param res
   * @param next
   */
  m.getFileCropped = (req, res, next) => {
    getFile(true, req, res, next);
  };

  /**
   * Returns thumbnail for the file
   * @param req
   * @param res
   * @param next
   */
  m.getFileThumbnail = (req, res, next) => {
    const File = mongoose.model('files');

    File.findById(req.params.id, (err, data) => {
      if (err) {
        mainController.error(req, res, next, 'Error occured while retrieving the file');
        return;
      }

      if (!data) {
        mainController.error(req, res, next, 'File not found in the database'); // TODO: should I return 404?
        return;
      }

      const fullPath = `../${data.filePath}_thumbnail`;
      if (fs.pathExistsSync(fullPath)) {
        res.writeHead(200, {
          'Content-Type': data.mimeType,
          'Content-Disposition': 'inline',
        });
        const stream = fs.createReadStream(fullPath);
        stream.on('end', next);
        stream.pipe(res);
      } else {
        const newFullPath = `./model/public/default-thumbnails/${data.mimeType.replace(
          /\//g,
          '-'
        )}.png`;

        if (fs.pathExistsSync(newFullPath)) {
          sendFile(
            newFullPath,
            { mimeType: 'image/png', originalName: 'default.png' },
            req,
            res,
            next
          );
        } else if (fs.pathExistsSync('./model/public/default-thumbnails/default.png')) {
          sendFile(
            './model/public/default-thumbnails/default.png',
            { mimeType: 'image/png', originalName: 'default.png' },
            req,
            res,
            next
          );
        } else {
          mainController.error(req, res, next, 'No thumbnail available');
        }
      } // TODO: also check in app model
    });
  };

  return m;
};
