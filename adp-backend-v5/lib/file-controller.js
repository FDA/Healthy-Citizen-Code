const fs = require('fs-extra');
const _ = require('lodash');
const log = require('log4js').getLogger('lib/default-controller');
const jimp = require('jimp');
const mongoose = require('mongoose');
const mime = require('mime');
const imageMediaTypes = require('../model/model/0_mediaTypes.json').mediaTypes.images;
const imagesTypesMap = imageMediaTypes.map(ext => mime.getType(ext));

module.exports = (appLib) => {
  const m = {};
  const mainController = require("./default-controller")(appLib);

  /**
   * Test method for uploading files, will be replaced with methods specified for each field
   * TODO: improve this method to handle file uploads securely and assign them to users (so nobody else can see other person's uploads
   * @param req
   * @param res
   * @param next
   */
  m.upload = function(req, res, next) {
    const onSuccess = files => {
      res.json({success: true, data: files});
      next();
    };

    const onError = err => {
      log.error(err);
      res.json({success: false, message: 'Error occurred while uploading files'});
    };

    // image crop update
    // todo: move to separated endpoint
    if (_.isEmpty(req.files) && hasCropParams(req)) {
      return updateCrop(req)
        .then(onSuccess)
        .catch(onError);
    }

    if (_.isEmpty(req.files)) {
      return mainController.error(req, res, next, 'No file or data received');
    }

    // file creation
    log.trace(`Accepting uploaded files: ${JSON.stringify(req.files, null, 4)}` );
    handleUpload(req)
      .then(onSuccess)
      .catch(onError);
  };

  function handleUpload(req) {
    const handleSingleFileUpload = (file) => {
      return createFile(file)
        .then(savedFile => processImage(savedFile, req))
        .then(savedFile => savedFile.save())
        .then(fileToObject);
    };

    return Promise.all(_.map(req.files, handleSingleFileUpload))

  }

  function createFile(reqFile) {
    const File = mongoose.model('files');
    const newFile = new File({
      originalName: reqFile.name,
      size: reqFile.size,
      mimeType: reqFile.type,
    }, false);
    if (!fs.existsSync('uploads')){
      fs.mkdirSync('uploads');
    }
    return newFile.save()
      .then(savedFile => {
        let uploadFolder = Math.random().toString(36).substr(2, 4);
        let destinationPath = `uploads/${uploadFolder}/${savedFile._id}`;

        return fs.move(reqFile.path, `../${destinationPath}`)
          .then(_f => {
            // !!! not obvious
            savedFile.set('filePath', destinationPath);
            return savedFile;
          });
      });
  }

  function processImage(savedFile, req) {
    if (!isImage(savedFile)) {
      return Promise.resolve(savedFile);
    }

    const thumbPromise = thumb(savedFile);

    const cropPromise = hasCropParams(req) ?
      crop(req.body.cropParams, savedFile) :
      Promise.resolve();

    return Promise.all([thumbPromise, cropPromise])
      .then(() => savedFile);
  }

  function fileToObject(savedFile) {
    const _doc = savedFile.toObject();

    return {
      name: _doc.originalName,
      size: _doc.size,
      type: _doc.mimeType,
      id: _doc._id,
      cropped: !!_doc.cropped
    }
  }

  function isImage(file) {
    return imagesTypesMap.indexOf(file.mimeType) > -1;
  }

  function thumb(savedFile) {
    return new Promise((resolve, reject) => {
      jimp.read('../' + savedFile.filePath, (err, imageBuffer) => {
        if (err) {
          return reject('Unable to process data');
        }

        imageBuffer
          .cover(48,48)
          .getBuffer(savedFile.mimeType, (err, imageBuffer) => {
            if(err) {
              return reject('Unable to process data');
            }

            fs.writeFile('../' + savedFile.filePath + '_thumbnail', imageBuffer)
              .then(resolve);
          });
      });
    })
  }


  function crop(params, savedFile) {
    const cropParams = JSON.parse(params);

    if (!cropParamsIsValid(cropParams)) {
      throw new Error('invalid crop params');
    }

    return new Promise((resolve, reject) => {
      jimp.read('../' + savedFile.filePath, (err, imageBuffer) => {
        imageBuffer
          .crop(
            cropParams.cropImageLeft,
            cropParams.cropImageTop,
            cropParams.cropImageWidth,
            cropParams.cropImageHeight
          )
          .getBuffer(savedFile.mimeType, (err, imageBuffer) => {
            if(err) {
              return reject('Unable to process data');
            }

            // !!! not obvious
            savedFile.set('cropped', true);
            savedFile.set('croppingParameters', cropParams);

            fs.writeFile('../' + savedFile.filePath + '_cropped', imageBuffer)
              .then(resolve);
          });
      })
    });
  }

  function hasCropParams(req) {
    return req.body && req.body.cropParams && _.isString(req.body.cropParams);
  }

  function cropParamsIsValid(cropParams) {
    return cropParams.hasOwnProperty("cropImageWidth") && cropParams.hasOwnProperty("cropImageHeight") &&
      cropParams.hasOwnProperty("cropImageTop") && cropParams.hasOwnProperty("cropImageLeft")
  }

  function updateCrop(req) {
    const cropParams = JSON.parse(req.body.cropParams);

    if (!cropParamsIsValid(cropParams)) {
      throw new Error('invalid crop params');
    }

    const File = mongoose.model('files');

    return File.findById(cropParams.id)
      .then(fileRecord => {
        if (!fileRecord) {
          throw new Error(`Unable to find file with id: ${cropParams.id}`);
        }

        return crop(req.body.cropParams, fileRecord).then(() => fileRecord);
      })
      .then(fileRecord => fileRecord.save())
      .then(fileRecord => [fileToObject(fileRecord)]);
  }

  function getFile(cropped, req, res, next) {
    let File = mongoose.model('files');

    File.findById(req.params.id, (err, data) => {
      if(err) {
        mainController.error(req, res, next, "Error occured while retrieving the file")
      } else if(!data) {
        mainController.error(req, res, next, "File not found in the database"); // TODO: should I return 404?
      } else {
        let fullPath = cropped ? `../${data.filePath}_cropped` : `../${data.filePath}`;
        if(fs.pathExistsSync(fullPath)) {
          sendFile(fullPath, data, req, res, next);
        } else {
          mainController.error(req, res, next, "File not found on server"); // TODO: should I return 404?
        }
      }
    });
  };

  /**
   * Streams file to browser
   * @param req
   * @param res
   * @param next
   */
  m.sendFile = sendFile;
  function sendFile(fullPath, data, req, res, next) {
    res.writeHead(200, {
      "Content-Type": data.mimeType,
      "Content-Disposition" : req.url.startsWith('/download') ? `attachment; filename=${data.originalName}` : 'inline',
      //"Content-Length": data.size
    });
    let stream = fs.createReadStream(fullPath);
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
    let File = mongoose.model('files');

    File.findById(req.params.id, (err, data) => {
      if(err) {
        mainController.error(req, res, next, "Error occured while retrieving the file");
        return;
      }

      if(!data) {
        mainController.error(req, res, next, "File not found in the database"); // TODO: should I return 404?
        return;
      }

      let fullPath = `../${data.filePath}_thumbnail`;
      if(fs.pathExistsSync(fullPath)) {
        res.writeHead(200, {
          "Content-Type": data.mimeType,
          "Content-Disposition" : 'inline'
        });
        let stream = fs.createReadStream(fullPath);
        stream.on('end', next);
        stream.pipe(res);
      } else {
        let fullPath = `./model/public/default-thumbnails/${data.mimeType.replace(/\//g, '-')}.png`;

        if(fs.pathExistsSync(fullPath)) {
          sendFile(fullPath, {mimeType: 'image/png', originalName: 'default.png'}, req, res, next);
        } else if(fs.pathExistsSync('./model/public/default-thumbnails/default.png')) {
          sendFile('./model/public/default-thumbnails/default.png', {mimeType: 'image/png', originalName: 'default.png'}, req, res, next);
        } else {
          mainController.error(req, res, next, "No thumbnail available")
        }
      } // TODO: also check in app model
    });
  };

  return m;
};
