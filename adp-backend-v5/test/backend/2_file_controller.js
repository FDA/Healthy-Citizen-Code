// NOTE: Passing arrow functions (“lambdas”) to Mocha is discouraged (http://mochajs.org/#asynchronous-code)
// TODO: add tests for multiple tables
// TODO: add tests for default foreignKey

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

  it('Should upload photo', async function() {
    await this.appLib.setup();
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
    await this.appLib.setup();
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
    await this.appLib.setup();
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
