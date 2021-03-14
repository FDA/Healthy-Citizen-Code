const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');
const { ObjectId } = require('mongodb');
const log = require('log4js').getLogger('lib/file-controller');

module.exports = (appLib) => {
  const m = {};
  const { updateCrop, handleUpload, getCropParams } = require('./file-controller-util')(appLib.db);
  const mainController = require('./default-controller')(appLib);
  const File = appLib.db.collection('files');

  /**
   * Test method for uploading files, will be replaced with methods specified for each field
   * TODO: improve this method to handle file uploads securely and assign them to users (so nobody else can see other person's uploads
   * @param req
   * @param res
   * @param next
   */
  m.upload = async (req, res, next) => {
    const onSuccess = (files) => {
      res.json({ success: true, data: files });
      next();
    };

    const onError = (err) => {
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
        const data = await updateCrop(cropParams);
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
    if (!ObjectId.isValid(id)) {
      const errMessage = `Invalid id ${id}`;
      return mainController.error(req, res, next, new Error(errMessage), errMessage);
    }

    try {
      const { record } = await File.hookQuery('findOne', { _id: ObjectId(id) });
      if (!record) {
        const errMessage = 'File not found in the database';
        return mainController.error(req, res, next, new Error(errMessage), errMessage);
      }

      const initFilePath = path.resolve(record.filePath);
      const requestedFilePath = cropped ? `${initFilePath}_cropped` : initFilePath;
      const exists = await fs.pathExists(requestedFilePath);
      if (exists) {
        return sendFile(requestedFilePath, record, req, res, next);
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
  m.getFileThumbnail = async (req, res, next) => {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      const errMessage = `Invalid id ${id}`;
      return mainController.error(req, res, next, new Error(errMessage), errMessage);
    }

    try {
      const { record: data } = await File.hookQuery('findOne', { _id: ObjectId(id) });

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
        return;
      }

      const newFullPath = `./model/public/default-thumbnails/${data.mimeType.replace(/\//g, '-')}.png`;
      if (fs.pathExistsSync(newFullPath)) {
        return sendFile(newFullPath, { mimeType: 'image/png', originalName: 'default.png' }, req, res, next);
      }
      if (fs.pathExistsSync('./model/public/default-thumbnails/default.png')) {
        return sendFile(
          './model/public/default-thumbnails/default.png',
          { mimeType: 'image/png', originalName: 'default.png' },
          req,
          res,
          next
        );
      }

      mainController.error(req, res, next, new Error('No thumbnail available'));
    } catch (error) {
      mainController.error(req, res, next, error, 'Error occurred while retrieving the file');
    }
  };

  return m;
};
