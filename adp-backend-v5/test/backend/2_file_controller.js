const path = require('path');
const Promise = require('bluebird');
const should = require('should');
const jimp = require('jimp');
const fs = require('fs-extra');
const { ObjectID } = require('mongodb');

const {
  getMongoConnection,
  setAppAuthOptions,
  prepareEnv,
  auth: { admin },
  resourceRequest,
  apiRequest,
} = require('../test-util');

describe('File Controller', function () {
  before(async function () {
    prepareEnv();
    this.appLib = require('../../lib/app')();
    setAppAuthOptions(this.appLib, {
      requireAuthentication: false,
      enablePermissions: false,
    });
    const db = await getMongoConnection();
    this.db = db;
  });

  after(async function () {
    await this.db.dropDatabase();
    await this.db.close();
  });

  beforeEach(async function () {
    await this.db.collection('users').deleteMany({});
    await this.db.collection('users').insertOne(admin);
    await this.appLib.setup();
  });

  afterEach(function () {
    return this.appLib.shutdown();
  });

  const binaryParser = (res, callback) => {
    res.setEncoding('binary');
    res.data = '';
    res.on('data', function (chunk) {
      res.data += chunk;
    });
    res.on('end', function () {
      callback(null, Buffer.from(res.data, 'binary'));
    });
  };

  const filesList = [
    { name: 'test-module.js' },
    { name: 'client/client.module.js' },
    { name: 'nested/nested_file.js' },
    { name: 'nested/another_nested/another_nested_file.js' },
    { name: 'adp-bpm-diagrams/adp-bpm-diagrams.module.js' },
    { name: 'adp-bpm-diagrams/adp-bpm-editor.css', mimeType: 'text/css' },
    { name: 'adp-bpm-diagrams/adp-bpm.helper.js' },
    { name: 'adp-bpm-diagrams/adp-decision-menu.helper.js' },
    { name: 'adp-client-common/adp-client-common.module.js' },
    { name: 'adp-data-export/adp-data-export-generators.service.js' },
    { name: 'adp-data-export/adp-data-export.helpers.js' },
    { name: 'adp-data-export/adp-data-export.module.js' },
    { name: 'adp-data-export/adp-data-export.service.js' },
    { name: 'adp-data-export/adp-export-config-modal.component.js' },
    { name: 'adp-data-export/adp-export-config-modal.controller.js' },
    { name: 'adp-data-import/adp-data-import-report-modal.component.js' },
    { name: 'adp-data-import/adp-data-import.module.js' },
    { name: 'adp-data-import/adp-data-import.service.js' },
    { name: 'adp-grid-column-chooser/adp-grid-column-chooser.module.js' },
    { name: 'adp-grid-control-actions/adp-grid-control-actions.module.js' },
    { name: 'adp-grid-print/adp-grid-print-table-builder.service.js' },
    { name: 'adp-grid-print/adp-grid-print.module.js' },
    { name: 'adp-grid-quick-filter/adp-grid-quick-filter.module.js' },
    { name: 'adp-grid-view-manager/adp-grid-view-manager.component.js' },
    { name: 'adp-grid-view-manager/adp-grid-view-manager.controller.js' },
    { name: 'adp-grid-view-manager/adp-grid-view-manager.module.js' },
    { name: 'adp-grid-view-manager/adp-grid-view-manager.service.js' },
    { name: 'adp-rtc-actions/adp-rtc-actions.module.js' },
    { name: 'adp-synthetic-generate/adp-synthetic-generate.component.js' },
    { name: 'adp-synthetic-generate/adp-synthetic-generate.controller.js' },
    { name: 'adp-synthetic-generate/adp-synthetic-generate.module.js' },
    { name: 'adp-webvowl/adp-webvowl.directive.js' },
    { name: 'adp-webvowl/adp-webvowl.module.js' },
    { name: 'default/default.module.js' },
    { name: 'adp-bpm-diagrams/bpm-types/adp-bpmn.config.js' },
    { name: 'adp-bpm-diagrams/bpm-types/adp-bpmn.helper.js' },
    { name: 'adp-bpm-diagrams/bpm-types/adp-dnm.config.js' },
    { name: 'adp-bpm-diagrams/bpm-types/adp-dnm.helper.js' },
    { name: 'adp-filter-builder/adp-filter-builder.component.js' },
    { name: 'adp-filter-builder/adp-filter-builder.controller.js' },
    { name: 'adp-filter-builder/adp-filter-builder.module.js' },
    { name: 'adp-filter-builder/adp-filter-builder.service.js' },
    { name: 'adp-form-actions/adp-form-actions.module.js' },
    { name: 'adp-profile/adp-profile.module.js' },
    { name: 'adp-roles-permissions-editor/adp-roles-permissions-editor.module.js' },
  ];

  describe('Serving public files', function () {
    it('Should show merged files for dir "/public/js/client-modules" from core and app model', async function () {
      const res = await resourceRequest(this.appLib.app).get('/public/js/client-modules');
      const { success, data } = res.body;
      should(success).equal(true);
      should(data.length).equal(filesList.length);
      // empty files with 0 size are in app model, default-module.js is in core
      should(data).containDeep(filesList);
    });

    it('Should not show any files in directories out of "/public/js/client-modules"', async function () {
      const dirs = ['/public', '/public/default-thumbnails', '/public/css', '/public/img', '/public/logo'];
      const responses = await Promise.map(dirs, (dir) => resourceRequest(this.appLib.app).get(dir));
      responses.forEach((res) => {
        const { success, message } = res.body;
        should(success).equal(false);
        should(message).equal('Forbidden to access directory');
      });
    });

    it('Should show single files in /public directory', async function () {
      const res = await resourceRequest(this.appLib.app).get('/public/manifest.json');
      should(res.statusCode).equal(200);
      should(res.type).equal('application/json');
    });
  });

  describe('Upload files', function () {
    it('Should upload photo', async function () {
      const fileName = 'test image.jpeg';
      const testFilePath = path.resolve(__dirname, `../files/${fileName}`);
      const testFileBytesSize = (await fs.stat(testFilePath)).size;

      const cropParams = {
        canvasSize: { w: 480, h: 480 },
        areaCoords: { x: 60, y: 0, w: 330, h: 330 },
        cropWidth: 330,
        cropHeight: 330,
        cropTop: 0,
        cropLeft: 60,
        cropImageWidth: 330,
        cropImageHeight: 330,
        cropImageTop: 0,
        cropImageLeft: 60,
      };
      const uploadRes = await apiRequest(this.appLib.app)
        .post('/upload')
        .field('cropParams', JSON.stringify(cropParams))
        .attach('file', testFilePath)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/);
      const { name, size, type, id, cropped, hash } = uploadRes.body.data[0];

      try {
        should(name).be.equal(fileName);
        should(size).be.equal(testFileBytesSize);
        should(type).be.equal('image/jpeg');
        should(ObjectID.isValid(id)).be.equal(true);
        should(cropped).be.equal(true);
        should(hash).be.equal('y74EDiyIUQxbaVer/Onv7jZ4EB0=');

        // image urls
        const urls = [`/file/${id}`, `/file-thumbnail/${id}`, `/file-cropped/${id}`, `/download/${id}`];
        const [file, thumb, crop, download] = await Promise.map(urls, async (url) => {
          const res = await apiRequest(this.appLib.app).get(url).buffer().parse(binaryParser);
          return { image: await jimp.read(res.body), bufSize: res.body.byteLength };
        });
        // file url
        const fileRes = await apiRequest(this.appLib.app)
          .get(`/files/${id}`)
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/);
        const { filePath: relativeFilePath } = fileRes.body.data;

        // check original file
        should(file.image.bitmap.width).be.equal(cropParams.canvasSize.w);
        should(file.image.bitmap.height).be.equal(cropParams.canvasSize.h);
        should(file.bufSize).be.equal(testFileBytesSize);
        const filePath = path.resolve(process.cwd(), relativeFilePath);
        should(await fs.exists(filePath)).be.equal(true);
        should((await fs.stat(filePath)).size).be.equal(testFileBytesSize);

        // download is the same as original file except it adds 'attachment' to 'Content-Disposition' to auto-download file in browser
        should(download.image.bitmap.width).be.equal(cropParams.canvasSize.w);
        should(download.image.bitmap.height).be.equal(cropParams.canvasSize.h);
        should(download.bufSize).be.equal(testFileBytesSize);

        // check crop image and endpoint
        const croppedFilePath = `${filePath}_cropped`;
        should(await fs.exists(croppedFilePath)).be.equal(true);
        const croppedImage = await jimp.read(croppedFilePath);
        should(croppedImage.bitmap.width).be.equal(cropParams.cropWidth);
        should(croppedImage.bitmap.height).be.equal(cropParams.cropHeight);
        should(crop.image.bitmap.width).be.equal(cropParams.cropWidth);
        should(crop.image.bitmap.height).be.equal(cropParams.cropHeight);

        // check thumbnail image
        const thumbFilePath = `${filePath}_thumbnail`;
        should(await fs.exists(thumbFilePath)).be.equal(true);
        const thumbImage = await jimp.read(thumbFilePath);
        should(thumbImage.bitmap.width).be.equal(48);
        should(thumbImage.bitmap.height).be.equal(48);
        should(thumb.image.bitmap.width).be.equal(48);
        should(thumb.image.bitmap.height).be.equal(48);
      } finally {
        await this.appLib.fileControllerUtil.removeFile(id);
      }
    });

    it('Should upload video', async function () {
      const fileName = 'test video.webm';
      const testFilePath = path.resolve(__dirname, `../files/${fileName}`);
      const testFileBytesSize = (await fs.stat(testFilePath)).size;

      const uploadRes = await apiRequest(this.appLib.app)
        .post('/upload')
        .attach('file', testFilePath)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/);
      const { name, size, type, id, hash } = uploadRes.body.data[0];
      try {
        should(name).be.equal(fileName);
        should(size).be.equal(testFileBytesSize);
        should(type).be.equal('video/webm');
        should(ObjectID.isValid(id)).be.equal(true);
        should(hash).be.equal('EaY3VMzIaEma9gNmRHyRV4Vnzvk=');

        const { body } = await apiRequest(this.appLib.app).get(`/download/${id}`).buffer().parse(binaryParser);
        should(body.byteLength).be.equal(testFileBytesSize);

        const fileRes = await apiRequest(this.appLib.app)
          .get(`/files/${id}`)
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/);
        const { filePath: relativeFilePath } = fileRes.body.data;

        // check original file
        const filePath = path.resolve(process.cwd(), relativeFilePath);
        should(await fs.exists(filePath)).be.equal(true);
        should((await fs.stat(filePath)).size).be.equal(testFileBytesSize);
      } finally {
        await this.appLib.fileControllerUtil.removeFile(id);
      }
    });

    it('Should upload audio', async function () {
      const fileName = 'file_example_MP3_5MG.mp3';
      const testFilePath = path.resolve(__dirname, `../files/${fileName}`);
      const testFileBytesSize = (await fs.stat(testFilePath)).size;

      const uploadRes = await apiRequest(this.appLib.app)
        .post('/upload')
        .attach('file', testFilePath)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/);
      const { name, size, type, id, hash } = uploadRes.body.data[0];

      try {
        should(name).be.equal(fileName);
        should(size).be.equal(testFileBytesSize);
        should(type).be.equal('audio/mpeg');
        should(ObjectID.isValid(id)).be.equal(true);
        should(hash).be.equal('0nrSVZOsNRVIbbF2XgWj1VywuXk=');

        const { body } = await apiRequest(this.appLib.app).get(`/download/${id}`).buffer().parse(binaryParser);
        should(body.byteLength).be.equal(testFileBytesSize);

        const fileRes = await apiRequest(this.appLib.app)
          .get(`/files/${id}`)
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/);
        const { filePath: relativeFilePath } = fileRes.body.data;

        // check original file
        const filePath = path.resolve(process.cwd(), relativeFilePath);
        should(await fs.exists(filePath)).be.equal(true);
        should((await fs.stat(filePath)).size).be.equal(testFileBytesSize);
      } finally {
        await this.appLib.fileControllerUtil.removeFile(id);
      }
    });
  });
});
