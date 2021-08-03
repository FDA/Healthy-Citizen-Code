const path = require('path');
const Promise = require('bluebird');
const should = require('should');
const jimp = require('jimp');
const fs = require('fs-extra');
const { ObjectID } = require('mongodb');
const cookie = require('cookie');

const {
  getMongoConnection,
  setAppAuthOptions,
  prepareEnv,
  auth: { user, loginWithUser },
  apiRequest,
} = require('../test-util');

const getCookies = (uploadRes) => {
  const cookies = uploadRes.headers['set-cookie'];
  const { sessionCookieName } = require('../../lib/util/cookie');
  const sessionCookie = cookies.find((c) => cookie.parse(c)[sessionCookieName]);
  should(sessionCookie).not.be.empty();
  return cookies;
};

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

function getToken(appLib, authEnabled) {
  return authEnabled ? loginWithUser(appLib, user) : null;
}

function setTokenForReq(apiReq, token) {
  if (token) {
    apiReq.set('Authorization', `JWT ${token}`);
  }
  return apiReq;
}

async function performUploadTests(authEnabled) {
  before(async function () {
    this.appLib = prepareEnv();
    const db = await getMongoConnection(this.appLib.options.MONGODB_URI);
    this.db = db;
  });

  after(async function () {
    await this.db.dropDatabase();
    await this.db.close();
  });

  beforeEach(async function () {
    await this.db.collection('users').deleteMany({});
    await this.db.collection('users').insertOne(user);

    setAppAuthOptions(this.appLib, {
      requireAuthentication: authEnabled,
      enablePermissions: authEnabled,
    });
    await this.appLib.setup();
  });

  afterEach(function () {
    return this.appLib.shutdown();
  });

  it('Should upload photo', async function () {
    const {
      util: { removeFile },
      constants: { filesCollectionName },
    } = this.appLib.file;

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

    const token = await getToken(this.appLib, authEnabled);

    const uploadRes = await setTokenForReq(
      apiRequest(this.appLib)
        .post('/upload')
        .field('cropParams', JSON.stringify(cropParams))
        .attach('file', testFilePath)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/),
      token
    );

    const { name, size, type, id, cropped, hash } = uploadRes.body.data[0];
    try {
      const cookies = getCookies(uploadRes);

      should(name).be.equal(fileName);
      should(size).be.equal(testFileBytesSize);
      should(type).be.equal('image/jpeg');
      should(ObjectID.isValid(id)).be.equal(true);
      should(cropped).be.equal(true);
      should(hash).be.equal('y74EDiyIUQxbaVer/Onv7jZ4EB0=');

      // image urls
      const linkUrls = [`/file-link/${id}`, `/file-link/${id}?fileType=thumbnail`, `/file-link/${id}?fileType=cropped`];
      const { FILE_LINK_EXPIRES_IN } = this.appLib.config;
      const linkIds = await Promise.map(linkUrls, async (linkUrl) => {
        const linkRes = await setTokenForReq(
          apiRequest(this.appLib).get(linkUrl).set('Cookie', cookies).expect('Content-Type', /json/),
          token
        );
        should(linkRes.body.success).be.true();
        const { linkId, expiresAt } = linkRes.body.data;
        const estimatedExpireDate = new Date(new Date().getTime() + FILE_LINK_EXPIRES_IN);
        should(new Date(expiresAt)).be.lessThanOrEqual(estimatedExpireDate);
        return linkId;
      });

      const [file, thumb, crop] = await Promise.map(linkIds, async (linkId) => {
        const res = await apiRequest(this.appLib)
          .get(`/file/${linkId}`)
          .set('Cookie', cookies)
          .buffer()
          .parse(binaryParser);
        return { image: await jimp.read(res.body), bufSize: res.body.byteLength };
      });
      const fileRecordRes = await setTokenForReq(
        apiRequest(this.appLib)
          .get(`/${filesCollectionName}/${id}`)
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/),
        token
      );
      const { filePath: relativeFilePath } = fileRecordRes.body.data;

      // check original file
      should(file.image.bitmap.width).be.equal(cropParams.canvasSize.w);
      should(file.image.bitmap.height).be.equal(cropParams.canvasSize.h);
      should(file.bufSize).be.equal(testFileBytesSize);
      const filePath = path.resolve(process.cwd(), relativeFilePath);
      should(await fs.exists(filePath)).be.equal(true);
      should((await fs.stat(filePath)).size).be.equal(testFileBytesSize);

      // check original image and image retrieved from endpoint
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
      await removeFile(id);
    }
  });

  it('Should upload video', async function () {
    const {
      util: { removeFile },
      constants: { filesCollectionName },
    } = this.appLib.file;

    const fileName = 'test video.webm';
    const testFilePath = path.resolve(__dirname, `../files/${fileName}`);
    const testFileBytesSize = (await fs.stat(testFilePath)).size;

    const token = await getToken(this.appLib, authEnabled);
    const uploadRes = await setTokenForReq(
      apiRequest(this.appLib)
        .post('/upload')
        .attach('file', testFilePath)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/),
      token
    );

    const { name, size, type, id, hash } = uploadRes.body.data[0];

    try {
      should(name).be.equal(fileName);
      should(size).be.equal(testFileBytesSize);
      should(type).be.equal('video/webm');
      should(ObjectID.isValid(id)).be.equal(true);
      should(hash).be.equal('EaY3VMzIaEma9gNmRHyRV4Vnzvk=');

      const cookies = getCookies(uploadRes);
      const linkRes = await setTokenForReq(
        apiRequest(this.appLib).get(`/file-link/${id}`).set('Cookie', cookies).expect('Content-Type', /json/),
        token
      );
      const { linkId } = linkRes.body.data;
      const fileRes = await apiRequest(this.appLib)
        .get(`/file/${linkId}`)
        .set('Cookie', cookies)
        .buffer()
        .parse(binaryParser);
      const fileResByteLength = fileRes.body.byteLength;
      should(fileResByteLength).be.equal(testFileBytesSize);

      const fileRecordRes = await setTokenForReq(
        apiRequest(this.appLib)
          .get(`/${filesCollectionName}/${id}`)
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/),
        token
      );
      const { filePath: relativeFilePath } = fileRecordRes.body.data;
      // check original file
      const filePath = path.resolve(process.cwd(), relativeFilePath);
      should(await fs.exists(filePath)).be.equal(true);
      should((await fs.stat(filePath)).size).be.equal(testFileBytesSize);
    } finally {
      await removeFile(id);
    }
  });

  it('Should upload audio', async function () {
    const {
      util: { removeFile },
      constants: { filesCollectionName },
    } = this.appLib.file;

    const fileName = 'file_example_MP3_5MG.mp3';
    const testFilePath = path.resolve(__dirname, `../files/${fileName}`);
    const testFileBytesSize = (await fs.stat(testFilePath)).size;

    const token = await getToken(this.appLib, authEnabled);
    const uploadRes = await setTokenForReq(
      apiRequest(this.appLib)
        .post('/upload')
        .attach('file', testFilePath)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/),
      token
    );
    const { name, size, type, id, hash } = uploadRes.body.data[0];

    try {
      should(name).be.equal(fileName);
      should(size).be.equal(testFileBytesSize);
      should(type).be.equal('audio/mpeg');
      should(ObjectID.isValid(id)).be.equal(true);
      should(hash).be.equal('0nrSVZOsNRVIbbF2XgWj1VywuXk=');

      const cookies = getCookies(uploadRes);
      const linkRes = await setTokenForReq(
        apiRequest(this.appLib).get(`/file-link/${id}`).set('Cookie', cookies).expect('Content-Type', /json/),
        token
      );
      const { linkId } = linkRes.body.data;
      const fileRes = await apiRequest(this.appLib)
        .get(`/file/${linkId}`)
        .set('Cookie', cookies)
        .buffer()
        .parse(binaryParser);
      const fileResByteLength = fileRes.body.byteLength;
      should(fileResByteLength).be.equal(testFileBytesSize);

      const fileRecordRes = await setTokenForReq(
        apiRequest(this.appLib)
          .get(`/${filesCollectionName}/${id}`)
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/),
        token
      );
      const { filePath: relativeFilePath } = fileRecordRes.body.data;

      // check original file
      const filePath = path.resolve(process.cwd(), relativeFilePath);
      should(await fs.exists(filePath)).be.equal(true);
      should((await fs.stat(filePath)).size).be.equal(testFileBytesSize);
    } finally {
      await removeFile(id);
    }
  });
}

describe('File Controller', function () {
  describe('Upload files with requireAuthentication=true', function () {
    performUploadTests(true);
  });
  describe('Upload files with requireAuthentication=false', function () {
    performUploadTests(false);
  });
});
