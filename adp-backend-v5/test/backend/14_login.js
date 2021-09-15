const should = require('should');
const Promise = require('bluebird');

const {
  auth: { user },
  getMongoConnection,
  setAppAuthOptions,
  prepareEnv,
  apiRequest,
} = require('../test-util');

describe('V5 Backend Login', () => {
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
    await Promise.all([
      this.db.collection('users').deleteMany({}),
      this.db.collection('mongoMigrateChangeLog').deleteMany({}),
    ]);
    await Promise.all([this.db.collection('users').insertOne(user)]);
  });

  afterEach(function () {
    return this.appLib.shutdown();
  });

  async function getLoginData(appLib, login, password) {
    const res = await apiRequest(appLib)
      .post('/login')
      .send({ login, password })
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/);
    return res.body;
  }

  const incorrectPassword = 'invalid_password';
  const correctPassword = 'Password!1';
  const { login } = user;

  describe('login with different .env params', () => {
    it('If LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_TIME is equal to 0, then the backend should lock out the user after LOGIN_MAX_FAILED_LOGIN_ATTEMPTS failed attempts disregarding of time. If the user is temporarily locked out, then the user should be shown the error message specified in LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_COOLDOWN_MESSAGE (by default the same as the message for invalid login)', async function () {
      const { appLib } = this;
      setAppAuthOptions(this.appLib, {
        requireAuthentication: true,
        enablePermissions: true,
      });

      process.env.LOGIN_MAX_FAILED_LOGIN_ATTEMPTS = '1';
      process.env.LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_TIME = '0';
      process.env.LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_COOLDOWN = '0';
      process.env.LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_LOCKOUT_MESSAGE = '';

      await this.appLib.setup();
      await this.appLib.start();

      const {
        LOGIN_MAX_FAILED_LOGIN_ATTEMPTS,
        LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_TIME,
        LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_COOLDOWN,
        LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_LOCKOUT_MESSAGE,
      } = appLib.config;
      should(LOGIN_MAX_FAILED_LOGIN_ATTEMPTS).be.equal(1);
      const tenYearsInMs = 315576000000000;
      should(LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_TIME).be.equal(tenYearsInMs);
      should(LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_COOLDOWN).be.equal(0);
      should(LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_LOCKOUT_MESSAGE).be.equal(
        'This account was locked due to excessive number of incorrect logins. Please contact the system administrator in order to unlock the account.'
      );

      // attempt 1
      const { success: success1 } = await getLoginData(appLib, login, incorrectPassword);
      should(success1).be.false();
      const userData1 = await this.db.collection('users').findOne({ _id: user._id });
      should(userData1.failedLoginAttempts.length).equal(1);

      // attempt 2
      const attempt2Timestamp = new Date().getTime();
      const { success: success2, message: message2 } = await getLoginData(appLib, login, incorrectPassword);
      should(success2).be.false();
      should(message2).be.equal(LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_LOCKOUT_MESSAGE);

      const userData2 = await this.db.collection('users').findOne({ _id: user._id });
      const { disabledAt } = userData2;
      should(disabledAt instanceof Date).be.true();
      const disabledAtTimestamp = disabledAt.getTime();
      should(disabledAtTimestamp > attempt2Timestamp).be.true();
      should(disabledAtTimestamp < new Date().getTime()).be.true();

      // attempt 3
      const { success: success3, message: message3 } = await getLoginData(appLib, login, correctPassword);
      should(success3).be.false();
      should(message3).be.equal(LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_LOCKOUT_MESSAGE);
    });

    it('If the user made more than LOGIN_MAX_FAILED_LOGIN_ATTEMPTS login attempts within LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_TIME, then the system should temporarily lock out the account for the period of time specified in LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_COOLDOWN.', async function () {
      const { appLib } = this;
      setAppAuthOptions(this.appLib, {
        requireAuthentication: true,
        enablePermissions: true,
      });

      process.env.LOGIN_MAX_FAILED_LOGIN_ATTEMPTS = '2';
      process.env.LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_TIME = '10000';
      process.env.LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_COOLDOWN = '1500';
      process.env.LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_LOCKOUT_MESSAGE = 'loginMaxFailedLoginAttemptsLockoutMessage';
      process.env.LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_COOLDOWN_MESSAGE = 'loginMaxFailedLoginAttemptsCooldownMessage';

      await this.appLib.setup();
      await this.appLib.start();

      const {
        LOGIN_MAX_FAILED_LOGIN_ATTEMPTS,
        LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_TIME,
        LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_COOLDOWN,
        LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_LOCKOUT_MESSAGE,
        LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_COOLDOWN_MESSAGE,
      } = appLib.config;
      should(LOGIN_MAX_FAILED_LOGIN_ATTEMPTS).be.equal(2);
      should(LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_TIME).be.equal(10000);
      should(LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_COOLDOWN).be.equal(1500);
      should(LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_LOCKOUT_MESSAGE).be.equal('loginMaxFailedLoginAttemptsLockoutMessage');
      should(LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_COOLDOWN_MESSAGE).be.equal('loginMaxFailedLoginAttemptsCooldownMessage');

      // attempt 1
      const { success: success1 } = await getLoginData(appLib, login, incorrectPassword);
      should(success1).be.false();
      const userData1 = await this.db.collection('users').findOne({ _id: user._id });
      userData1.failedLoginAttempts.length.should.equal(1);

      // attempt 2
      const { success: success2 } = await getLoginData(appLib, login, incorrectPassword);
      should(success2).be.false();
      const userData2 = await this.db.collection('users').findOne({ _id: user._id });
      userData2.failedLoginAttempts.length.should.equal(2);

      // attempt 3, cooldown is set
      const loginCooldownRequestDate = new Date();
      const { success: success3 } = await getLoginData(appLib, login, incorrectPassword);
      should(success3).be.false();
      const userData3 = await this.db.collection('users').findOne({ _id: user._id });
      userData3.failedLoginAttempts.length.should.equal(0);
      should(userData3.loginCooldownAt instanceof Date).be.true();
      const cooldownTimestamp = userData3.loginCooldownAt.getTime();
      should(
        cooldownTimestamp > loginCooldownRequestDate.getTime() + LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_COOLDOWN
      ).be.true();
      const nowTimestamp = new Date().getTime();
      should(cooldownTimestamp < nowTimestamp + LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_COOLDOWN).be.true();

      // attempt 4, cooldown is working
      const { success: success4, message: message4 } = await getLoginData(appLib, login, correctPassword);
      should(success4).be.false();
      should(message4).be.equal(LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_COOLDOWN_MESSAGE);
      const userData4 = await this.db.collection('users').findOne({ _id: user._id });
      userData4.failedLoginAttempts.length.should.equal(0);

      // attempt 5, after cooldown
      const waitCooldownMs = cooldownTimestamp - new Date().getTime();
      await Promise.delay(waitCooldownMs);

      const { success: success5 } = await getLoginData(appLib, login, correctPassword);
      should(success5).be.true();
      const userData5 = await this.db.collection('users').findOne({ _id: user._id });
      should(userData5.failedLoginAttempts.length).be.equal(0);
      should(userData5.cooldownTimestamp).be.undefined();
    });

    it('If LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_COOLDOWN is equal to 0, then the the backend should lock out the user permanently', async function () {
      const { appLib } = this;
      setAppAuthOptions(this.appLib, {
        requireAuthentication: true,
        enablePermissions: true,
      });

      process.env.LOGIN_MAX_FAILED_LOGIN_ATTEMPTS = '2';
      process.env.LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_TIME = '10000';
      process.env.LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_COOLDOWN = '0';
      process.env.LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_LOCKOUT_MESSAGE = 'loginMaxFailedLoginAttemptsLockoutMessage';
      process.env.LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_COOLDOWN_MESSAGE = 'loginMaxFailedLoginAttemptsCooldownMessage';

      await this.appLib.setup();
      await this.appLib.start();

      const {
        LOGIN_MAX_FAILED_LOGIN_ATTEMPTS,
        LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_TIME,
        LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_COOLDOWN,
        LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_LOCKOUT_MESSAGE,
        LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_COOLDOWN_MESSAGE,
      } = appLib.config;
      should(LOGIN_MAX_FAILED_LOGIN_ATTEMPTS).be.equal(2);
      should(LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_TIME).be.equal(10000);
      should(LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_COOLDOWN).be.equal(0);
      should(LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_LOCKOUT_MESSAGE).be.equal('loginMaxFailedLoginAttemptsLockoutMessage');
      should(LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_COOLDOWN_MESSAGE).be.equal('loginMaxFailedLoginAttemptsCooldownMessage');

      // attempt 1
      const { success: success1 } = await getLoginData(appLib, login, incorrectPassword);
      should(success1).be.false();
      const userData1 = await this.db.collection('users').findOne({ _id: user._id });
      should(userData1.failedLoginAttempts.length).equal(1);

      // attempt 2
      const { success: success2 } = await getLoginData(appLib, login, incorrectPassword);
      should(success2).be.false();
      const userData2 = await this.db.collection('users').findOne({ _id: user._id });
      should(userData2.failedLoginAttempts.length).equal(2);

      // attempt 3
      const attempt3Timestamp = new Date().getTime();
      const { success: success3 } = await getLoginData(appLib, login, incorrectPassword);
      should(success3).be.false();

      const userData3 = await this.db.collection('users').findOne({ _id: user._id });

      userData3.failedLoginAttempts.length.should.equal(2);
      const { disabledAt } = userData3;
      should(disabledAt instanceof Date).be.true();
      const disabledAtTimestamp = disabledAt.getTime();
      should(disabledAtTimestamp > attempt3Timestamp).be.true();
      should(disabledAtTimestamp < new Date().getTime()).be.true();

      // attempt 4
      const { success: success4, message: message4 } = await getLoginData(appLib, login, correctPassword);
      should(success4).be.false();
      should(message4).be.equal(LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_LOCKOUT_MESSAGE);
    });

    it('If LOGIN_MAX_FAILED_LOGIN_ATTEMPTS is equal to 0, then the entire lockout system should be disabled (i.e. no lockouts are required even if the user keeps trying incorrect logins)', async function () {
      const { appLib } = this;
      setAppAuthOptions(this.appLib, {
        requireAuthentication: true,
        enablePermissions: true,
      });

      process.env.LOGIN_MAX_FAILED_LOGIN_ATTEMPTS = '0';
      process.env.LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_TIME = '10000';
      process.env.LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_COOLDOWN = '0';

      await this.appLib.setup();
      await this.appLib.start();

      const {
        LOGIN_MAX_FAILED_LOGIN_ATTEMPTS,
        LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_TIME,
        LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_COOLDOWN,
      } = appLib.config;
      should(LOGIN_MAX_FAILED_LOGIN_ATTEMPTS).be.equal(0);
      should(LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_TIME).be.equal(10000);
      should(LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_COOLDOWN).be.equal(0);

      // attempt 1
      const { success: success1 } = await getLoginData(appLib, login, incorrectPassword);
      should(success1).be.false();
      const userData1 = await this.db.collection('users').findOne({ _id: user._id });
      should(userData1.failedLoginAttempts).be.undefined();

      // attempt 2
      const {
        success: success2,
        data: { token },
      } = await getLoginData(appLib, login, correctPassword);
      should(success2).be.true();
      should(token).be.not.undefined();

      // attempt 3
      const { success: success3 } = await getLoginData(appLib, login, incorrectPassword);
      should(success3).be.false();
      const userData3 = await this.db.collection('users').findOne({ _id: user._id });
      should(userData3.failedLoginAttempts).be.empty();
    });
  });
});
