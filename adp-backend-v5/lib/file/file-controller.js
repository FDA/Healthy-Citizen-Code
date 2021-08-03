const fs = require('fs-extra');
const _ = require('lodash');
const { v4: uuidv4 } = require('uuid');
const log = require('log4js').getLogger('lib/file-controller');

module.exports = (appLib) => {
  const m = {};
  const {
    updateCrop,
    handleUpload,
    getCropParams,
    getUserLinkId,
    parseFileType,
    getFileInfo,
    sendFile,
    getFileHandlingErrors,
  } = require('./file-controller-util')(appLib);
  const mainController = require('../default-controller')(appLib);
  const { cache } = appLib;
  const { FILE_LINK_EXPIRES_IN } = appLib.config;
  const fileLinkStore = require('./file-link-storage').getFileLinkStorage(cache, FILE_LINK_EXPIRES_IN);

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
      return mainController.error(req, res, new Error(errMessage), errMessage);
    }

    log.trace(`Accepting uploaded files: ${JSON.stringify(req.files, null, 4)}`);
    const files = Object.values(req.files);
    try {
      const data = await handleUpload({ files, owner: appLib.accessUtil.getReqUser(req), cropParams });
      onSuccess(data);
    } catch (e) {
      onError(e);
    }
  };

  m.getFile = async (req, res, next) => {
    const { linkId } = req.params;
    const userLinkId = getUserLinkId(req);
    if (!userLinkId) {
      return mainController.error(req, res, null, `Unauthorized to get file`);
    }
    const fileInfo = await fileLinkStore.get(userLinkId, linkId);
    const invalidFileLinkMsg = `Invalid file link`;
    if (!fileInfo) {
      return mainController.error(req, res, null, invalidFileLinkMsg);
    }

    const { mimeType, originalName, filePath } = fileInfo;
    if (await fs.pathExists(filePath)) {
      return sendFile({
        attachment: req.query.attachment === 'true',
        fullPath: filePath,
        mimeType,
        originalName,
        res,
        next,
      });
    }

    return mainController.error(req, res, null, invalidFileLinkMsg);
  };

  m.getFileLink = async (req, res) => {
    const fileType = parseFileType(req.query.fileType);
    if (!fileType) {
      return mainController.error(req, res, null, `Invalid file type ${fileType}`);
    }

    try {
      const { fileId } = req.params;
      const record = await getFileHandlingErrors(req, fileId);
      const { filePath, mimeType } = await getFileInfo(record, fileType);
      const isFileExist = await fs.pathExists(filePath);
      if (isFileExist) {
        const userLinkId = getUserLinkId(req);
        const linkId = uuidv4();
        const fileInfo = await fileLinkStore.add(userLinkId, linkId, {
          fileId: record._id,
          filePath,
          mimeType,
          originalName: record.originalName,
        });

        return res.json({ success: true, data: { linkId, expiresAt: fileInfo.expiresAt } });
      }
      mainController.error(req, res, null, 'File not found on the server');
    } catch (e) {
      mainController.error(req, res, e, 'Error occurred while retrieving the file');
    }
  };

  return m;
};
