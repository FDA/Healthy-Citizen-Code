const request = require('supertest');
const path = require('path');
const Promise = require('bluebird');
const should = require('should');
const jimp = require('jimp');
const fs = require('fs-extra');
const { ObjectID } = require('mongodb');

const reqlib = require('app-root-path').require;

const {
  getMongoConnection,
  setAppAuthOptions,
  prepareEnv,
  auth: { admin },
} = reqlib('test/test-util');

describe('File Controller', function() {
  before(async function() {
    prepareEnv();
    this.appLib = reqlib('/lib/app')();
    setAppAuthOptions(this.appLib, {
      requireAuthentication: false,
      enablePermissions: false,
    });
    const db = await getMongoConnection();
    this.db = db;
  });

  after(async function() {
    await this.db.dropDatabase();
    await this.db.close();
  });

  beforeEach(async function() {
    await this.db.collection('users').deleteMany({});
    await this.db.collection('users').insertOne(admin);
    await this.appLib.setup();
  });

  afterEach(function() {
    return this.appLib.shutdown();
  });

  const binaryParser = (res, callback) => {
    res.setEncoding('binary');
    res.data = '';
    res.on('data', function(chunk) {
      res.data += chunk;
    });
    res.on('end', function() {
      callback(null, Buffer.from(res.data, 'binary'));
    });
  };

  const filesList = [
    {
      type: 'file',
      size: 0,
      name: 'test-module.js',
      mimeType: 'application/javascript',
    },
    {
      type: 'file',
      size: 0,
      name: 'client/client.module.js',
      mimeType: 'application/javascript',
    },
    {
      type: 'file',
      size: 0,
      name: 'nested/nested_file.js',
      mimeType: 'application/javascript',
    },
    {
      type: 'file',
      size: 0,
      name: 'nested/another_nested/another_nested_file.js',
      mimeType: 'application/javascript',
    },
    {
      type: 'file',
      size: 4873,
      name: 'adp-bpm-diagrams/adp-bpm-diagrams.module.js',
      mimeType: 'application/javascript',
    },
    {
      type: 'file',
      size: 872,
      name: 'adp-bpm-diagrams/adp-bpm-editor.css',
      mimeType: 'text/css',
    },
    {
      type: 'file',
      size: 2380,
      name: 'adp-bpm-diagrams/adp-bpm.helper.js',
      mimeType: 'application/javascript',
    },
    {
      type: 'file',
      size: 3339,
      name: 'adp-bpm-diagrams/adp-decision-menu.helper.js',
      mimeType: 'application/javascript',
    },
    {
      type: 'file',
      size: 621,
      name: 'adp-client-common/adp-client-common.module.js',
      mimeType: 'application/javascript',
    },
    {
      type: 'file',
      size: 787,
      name: 'adp-force-graph/adp-force-graph-3d.controller.js',
      mimeType: 'application/javascript',
    },
    {
      type: 'file',
      size: 27196,
      name: 'adp-force-graph/adp-force-graph-3d.logic.js',
      mimeType: 'application/javascript',
    },
    {
      type: 'file',
      size: 3844,
      name: 'adp-force-graph/adp-force-graph-vr.controller.js',
      mimeType: 'application/javascript',
    },
    {
      type: 'file',
      size: 1402,
      name: 'adp-force-graph/adp-force-graph.helpers.js',
      mimeType: 'application/javascript',
    },
    {
      type: 'file',
      size: 63,
      name: 'adp-force-graph/adp-force-graph.module.js',
      mimeType: 'application/javascript',
    },
    {
      type: 'file',
      size: 1877,
      name: 'adp-force-graph/adp-webvowl.directive.js',
      mimeType: 'application/javascript',
    },
    {
      type: 'file',
      size: 1180,
      name: 'default/default.module.js',
      mimeType: 'application/javascript',
    },
    {
      type: 'file',
      size: 1555,
      name: 'adp-bpm-diagrams/bpm-types/adp-bpmn.config.js',
      mimeType: 'application/javascript',
    },
    {
      type: 'file',
      size: 1058,
      name: 'adp-bpm-diagrams/bpm-types/adp-bpmn.helper.js',
      mimeType: 'application/javascript',
    },
    {
      type: 'file',
      size: 946,
      name: 'adp-bpm-diagrams/bpm-types/adp-dnm.config.js',
      mimeType: 'application/javascript',
    },
    {
      type: 'file',
      size: 2104,
      name: 'adp-bpm-diagrams/bpm-types/adp-dnm.helper.js',
      mimeType: 'application/javascript',
    },
  ];

  describe('Serving public files', () => {
    it('Should show merged files for dir "/public/js/client-modules" from core and app model', async function() {
      const res = await request(this.appLib.app).get('/public/js/client-modules');
      const { success, data } = res.body;
      should(success).equal(true);
      should(data.length).equal(filesList.length);
      // empty files with 0 size are in app model, default-module.js is in core
      should(data).containDeep(filesList);
    });

    it('Should not show any files in directories out of "/public/js/client-modules"', async function() {
      const dirs = ['/public', '/public/default-thumbnails', '/public/css', '/public/img', '/public/logo'];
      const responses = await Promise.map(dirs, dir => request(this.appLib.app).get(dir));
      responses.forEach(res => {
        const { success, message } = res.body;
        should(success).equal(false);
        should(message).equal('Forbidden to access directory');
      });
    });

    it('Should show single files in /public directory', async function() {
      const res = await request(this.appLib.app).get('/public/manifest.json');
      should(res.statusCode).equal(200);
      should(res.type).equal('application/json');
    });
  });

  describe('Upload files', () => {
    it('Should upload photo', async function() {
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
      const uploadRes = await request(this.appLib.app)
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
        const [file, thumb, crop, download] = await Promise.map(urls, async url => {
          const res = await request(this.appLib.app)
            .get(url)
            .buffer()
            .parse(binaryParser);
          return { image: await jimp.read(res.body), bufSize: res.body.byteLength };
        });
        // file url
        const fileRes = await request(this.appLib.app)
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

    it('Should upload video', async function() {
      const fileName = 'test video.webm';
      const testFilePath = path.resolve(__dirname, `../files/${fileName}`);
      const testFileBytesSize = (await fs.stat(testFilePath)).size;

      const uploadRes = await request(this.appLib.app)
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

        const { body } = await request(this.appLib.app)
          .get(`/download/${id}`)
          .buffer()
          .parse(binaryParser);
        should(body.byteLength).be.equal(testFileBytesSize);

        const fileRes = await request(this.appLib.app)
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

    it('Should upload audio', async function() {
      const fileName = 'file_example_MP3_5MG.mp3';
      const testFilePath = path.resolve(__dirname, `../files/${fileName}`);
      const testFileBytesSize = (await fs.stat(testFilePath)).size;

      const uploadRes = await request(this.appLib.app)
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

        const { body } = await request(this.appLib.app)
          .get(`/download/${id}`)
          .buffer()
          .parse(binaryParser);
        should(body.byteLength).be.equal(testFileBytesSize);

        const fileRes = await request(this.appLib.app)
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
