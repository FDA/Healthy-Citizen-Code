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
  m.upload = async (req, res, next) => {
    const onSuccess = files => {
      res.json({ success: true, data: files });
      next();
    };

    const onError = err => {
      log.error(err);
      res.status(401).json({ success: false, message: 'Error occurred while uploading files' });
    };

    let cropParams;
    try {
      cropParams = getCropParams(req);
    } catch (e) {
      return res.status(401).json({ success: false, message: e.message });
    }

    // image crop update
    if (_.isEmpty(req.files) && !_.isEmpty(cropParams)) {
      try {
        const data = await updateCrop(req);
        onSuccess(data);
      } catch (e) {
        onError(e);
      }
    }

    if (_.isEmpty(req.files)) {
      const errMessage = 'No file or data received';
      return mainController.error(req, res, next, new Error(errMessage), errMessage);
    }

    // file creation
    log.trace(`Accepting uploaded files: ${JSON.stringify(req.files, null, 4)}`);

    const files = Object.values(req.files);
    try {
      const data = await handleUpload(files, appLib.accessUtil.getReqUser(req), cropParams);
      onSuccess(data);
    } catch (e) {
      onError(e);
    }
  };

  async function getFile(cropped, req, res, next) {
    const { id } = req.params;
    const { ObjectId } = mongoose.Types;
    if (!ObjectId.isValid(id)) {
      const errMessage = `Invalid id ${id}`;
      return mainController.error(req, res, next, new Error(errMessage), errMessage);
    }

    try {
      const File = mongoose.model('files');
      const data = await File.findById(new ObjectId(id));
      if (!data) {
        const errMessage = 'File not found in the database';
        return mainController.error(req, res, next, new Error(errMessage), errMessage);
      }

      const initFilePath = path.resolve(data.filePath);
      const requestedFilePath = cropped ? `${initFilePath}_cropped` : initFilePath;
      const exists = await fs.pathExists(requestedFilePath);
      if (exists) {
        return sendFile(requestedFilePath, data, req, res, next);
      }
      const errMessage = 'File not found on the server';
      mainController.error(req, res, next, new Error(errMessage), errMessage);
    } catch (e) {
      mainController.error(req, res, next, e, 'Error occurred while retrieving the file');
    }
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
      'Content-Disposition': req.url.startsWith('/download') ? `attachment; filename=${data.originalName}` : 'inline',
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
    const { id } = req.params;
    const { ObjectId } = mongoose.Types;
    if (!ObjectId.isValid(id)) {
      const errMessage = `Invalid id ${id}`;
      return mainController.error(req, res, next, new Error(errMessage), errMessage);
    }

    const File = mongoose.model('files');

    File.findById(new ObjectId(id), (err, data) => {
      if (err) {
        mainController.error(req, res, next, err, 'Error occurred while retrieving the file');
        return;
      }

      if (!data) {
        mainController.error(req, res, next, new Error('File not found in the database'));
        return;
      }

      const fullPath = `${data.filePath}_thumbnail`;
      if (fs.pathExistsSync(fullPath)) {
        res.writeHead(200, {
          'Content-Type': data.mimeType,
          'Content-Disposition': 'inline',
        });
        const stream = fs.createReadStream(fullPath);
        stream.on('end', next);
        stream.pipe(res);
      } else {
        const newFullPath = `./model/public/default-thumbnails/${data.mimeType.replace(/\//g, '-')}.png`;

        if (fs.pathExistsSync(newFullPath)) {
          sendFile(newFullPath, { mimeType: 'image/png', originalName: 'default.png' }, req, res, next);
        } else if (fs.pathExistsSync('./model/public/default-thumbnails/default.png')) {
          sendFile(
            './model/public/default-thumbnails/default.png',
            { mimeType: 'image/png', originalName: 'default.png' },
            req,
            res,
            next
          );
        } else {
          mainController.error(req, res, next, err, 'No thumbnail available');
        }
      } // TODO: also check in app model
    });
  };

  return m;
};
