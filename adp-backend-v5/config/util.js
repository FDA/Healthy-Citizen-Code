const ms = require('ms');
const _ = require('lodash');
const nodePath = require('path');
const {md5} = require('../lib/util/hash');
const {PERMISSIONS} = require('../lib/access/access-config');

const appRoot = nodePath.resolve(__dirname, '../');
const envCollectionName = '_environment';

function getMs(value) {
  return _.isString(value) ? ms(value) : value;
}

function getSchemaNestedPaths(schemaPaths, nestedPath) {
  return schemaPaths.map((p) => `${p}/${nestedPath}`);
}

function castBooleanEnv(value, defaultValue) {
  if (_.isBoolean(value)) {
    return value;
  }

  const val = (value || '').toLowerCase();
  if (val === 'true') {
    return true;
  }
  if (val === 'false') {
    return false;
  }
  return defaultValue;
}

function castIntEnv(intString, defaultValue) {
  const int = parseInt(intString, 10);
  return !_.isNumber(int) || _.isNaN(int) ? defaultValue : int;
}

function castStringArrayEnv(value, defaultValue = []) {
  if (_.isEmpty(value)) {
    return defaultValue;
  }
  const arrVal = _.isArray(value) ? value : value.split(',');
  return arrVal.map((elem) => elem.trim());
}

function getCookieSameSite(sameSite) {
  const sameSiteVal = (sameSite || '').toLowerCase();
  if (['true', 'false'].includes(sameSite)) {
    return JSON.parse(sameSite);
  }
  if (['lax', 'strict', 'none'].includes(sameSiteVal)) {
    return sameSiteVal;
  }
  return 'strict';
}

function getAbsolutePath(root, p) {
  return p ? nodePath.resolve(root, p) : undefined;
}

function getAbsolutePathsFromCommaSeparated(root, paths = '') {
  return paths
    .split(',')
    .map((p) => getAbsolutePath(root, p))
    .filter((p) => p);
}

let envFieldsSchema;
function getEnvFieldsSchema() {
  if (envFieldsSchema) {
    return envFieldsSchema;
  }
  // for now it's only current repo's adp.environment section in package.json
  envFieldsSchema = _.get(require('../package.json'), 'adp.environment', {});
  return envFieldsSchema;
}

function getConfigFromEnv() {
  const envObj = {};
  const envFieldsSchema = getEnvFieldsSchema();
  _.each(envFieldsSchema, (field, key) => {
    if (!_.isUndefined(field.default)) {
      envObj[key] = field.default;
    }
    if (field.canBeDefinedInEnvironment && !_.isUndefined(process.env[key])) {
      envObj[key] = process.env[key];
    }
  });

  return getConfigFromObj(envObj);
}

async function getConfigFromDb(mongodbUri = process.env.MONGODB_URI) {
  let db;
  try {
    const { mongoConnect } = require('../lib/util/mongo');
    const { db: dbCon } = await mongoConnect(mongodbUri);
    db = dbCon;
  } catch (e) {
    throw new Error(`Unable to get connection for URI ${mongodbUri}`);
  }

  try {
    const envRecord = await db.collection(envCollectionName).findOne({});
    return getConfigMergedWithEnvRecord(envRecord);
  } catch (e) {
    throw new Error(`Unable to get env record. ${e.stack}`);
  } finally {
    await db.close();
  }
}

function getConfigFromObj(configObj) {
  const errors = [];
  const warnings = [];
  const c = {};

  c.APP_PORT = castIntEnv(configObj.APP_PORT, 8080);
  c.APP_URL = configObj.APP_URL;
  c.JWT_SECRET = configObj.JWT_SECRET;
  c.MONGODB_URI = configObj.MONGODB_URI;
  c.APP_NAME = configObj.APP_NAME;
  c.CREATE_INDEXES = castBooleanEnv(configObj.CREATE_INDEXES, true);
  c.DEVELOPMENT = castBooleanEnv(configObj.DEVELOPMENT, false);
  // Absolute paths are not error prone. Its being used in custom prototypes and tests
  c.LOG4JS_CONFIG = getAbsolutePath(appRoot, configObj.LOG4JS_CONFIG);
  c.APP_SCHEMA = configObj.APP_MODEL_DIR
    ? [getAbsolutePath(appRoot, configObj.APP_MODEL_DIR)]
    : getAbsolutePathsFromCommaSeparated(appRoot, configObj.APP_SCHEMA);

  c.REDIS_URL = configObj.REDIS_URL;
  c.REDIS_KEY_PREFIX = configObj.REDIS_KEY_PREFIX || 'cache';
  c.BULL_REDIS_URL = configObj.BULL_REDIS_URL || configObj.REDIS_URL;
  c.BULL_KEY_PREFIX = configObj.BULL_KEY_PREFIX || 'bull';
  if (c.REDIS_KEY_PREFIX === c.BULL_KEY_PREFIX) {
    errors.push(`Value for REDIS_KEY_PREFIX must be different from BULL_KEY_PREFIX ('${c.REDIS_KEY_PREFIX}')`);
  }
  c.SESSIONS_REDIS_URL = configObj.SESSIONS_REDIS_URL || configObj.REDIS_URL;
  c.SESSIONS_KEY_PREFIX = configObj.SESSIONS_KEY_PREFIX || 'sessions';

  c.SOCKETIO_REDIS_URL = configObj.SOCKETIO_REDIS_URL || configObj.REDIS_URL;
  c.SOCKETIO_KEY_PREFIX = configObj.SOCKETIO_KEY_PREFIX || 'socket.io';

  c.API_PREFIX = configObj.API_PREFIX || '';
  c.RESOURCE_PREFIX = configObj.RESOURCE_PREFIX || '';
  c.FRONTEND_URL = configObj.FRONTEND_URL;
  c.CORS_ORIGIN = configObj.CORS_ORIGIN
    ? [RegExp(configObj.CORS_ORIGIN)]
    : [/https:\/\/.+\.conceptant\.com/, /http:\/\/localhost\.conceptant\.com.*/, /http:\/\/localhost.*/];
  c.GOOGLE_API_KEY = configObj.GOOGLE_API_KEY;
  c.DATASET_RESOLVERS_EXPIRATION_TIME = getMs(configObj.DATASET_RESOLVERS_EXPIRATION_TIME || '24h');
  c.LOG_DB_URI = configObj.LOG_DB_URI || configObj.MONGODB_URI;
  c.LOG_DB_COLLECTION = configObj.LOG_DB_COLLECTION || '_journal';
  c.ES_NODES = castStringArrayEnv(configObj.ES_NODES);
  c.ES_MAX_RETRIES = castIntEnv(configObj.ES_MAX_RETRIES, 4);
  c.BUILD_APP_MODEL_CODE_ON_START = castBooleanEnv(configObj.BUILD_APP_MODEL_CODE_ON_START, true);
  c.USE_FARMHASH = castBooleanEnv(configObj.USE_FARMHASH, false);
  c.SEND_RTC_ON_MONGODB_CHANGE = castBooleanEnv(configObj.SEND_RTC_ON_MONGODB_CHANGE, false);
  c.USER_SESSION_ID_TIMEOUT = getMs(configObj.USER_SESSION_ID_TIMEOUT || '1d');

  c.RESET_PASSWORD_TOKEN_EXPIRES_IN = getMs(configObj.RESET_PASSWORD_TOKEN_EXPIRES_IN || '1h');
  c.JWT_ACCESS_TOKEN_EXPIRES_IN = getMs(configObj.JWT_ACCESS_TOKEN_EXPIRES_IN || '10m');
  c.JWT_REFRESH_TOKEN_EXPIRES_IN = getMs(configObj.JWT_REFRESH_TOKEN_EXPIRES_IN || '90d');

  c.EMAIL_HOST = configObj.EMAIL_HOST;
  c.EMAIL_PORT = castIntEnv(configObj.EMAIL_PORT);
  c.EMAIL_SECURE = castBooleanEnv(configObj.EMAIL_SECURE, false);
  c.EMAIL_POOL = castBooleanEnv(configObj.EMAIL_POOL, false);
  c.EMAIL_USER = configObj.EMAIL_USER;
  c.EMAIL_PASSWORD = configObj.EMAIL_PASSWORD;
  c.EMAIL_SERVICE = configObj.EMAIL_SERVICE;

  c.INACTIVITY_LOGOUT_NOTIFICATION_APPEARS_IN = getMs(configObj.INACTIVITY_LOGOUT_NOTIFICATION_APPEARS_IN || '15m');
  c.INACTIVITY_LOGOUT_IN = getMs(configObj.INACTIVITY_LOGOUT_IN || '20m');
  if (c.INACTIVITY_LOGOUT_NOTIFICATION_APPEARS_IN > c.INACTIVITY_LOGOUT_IN) {
    warnings.push(
      `Set INACTIVITY_LOGOUT_NOTIFICATION_APPEARS_IN(${c.INACTIVITY_LOGOUT_NOTIFICATION_APPEARS_IN}) to 0 since INACTIVITY_LOGOUT_IN(${c.INACTIVITY_LOGOUT_IN}) must be bigger than that.`
    );
    c.INACTIVITY_LOGOUT_NOTIFICATION_APPEARS_IN = 0;
  }
  c.INACTIVITY_LOGOUT_REMEMBER_OLD_TOKEN_FOR = getMs(configObj.INACTIVITY_LOGOUT_REMEMBER_OLD_TOKEN_FOR || '10s');
  c.IS_INACTIVITY_LOGOUT_ENABLED = c.INACTIVITY_LOGOUT_IN > 0;
  c.INACTIVITY_LOGOUT_NOTIFICATION_APPEARS_FROM_SESSION_END = c.INACTIVITY_LOGOUT_NOTIFICATION_APPEARS_IN
    ? c.INACTIVITY_LOGOUT_IN - c.INACTIVITY_LOGOUT_NOTIFICATION_APPEARS_IN
    : 0;
  c.INACTIVITY_LOGOUT_FE_PING_INTERVAL =
    getMs(configObj.INACTIVITY_LOGOUT_FE_PING_INTERVAL) || Math.round(c.INACTIVITY_LOGOUT_NOTIFICATION_APPEARS_IN / 3);

  c.LOGIN_MAX_FAILED_LOGIN_ATTEMPTS = castIntEnv(configObj.LOGIN_MAX_FAILED_LOGIN_ATTEMPTS, 3);
  // '10000years' is used since new Date(Infinity) is invalid. The range of times supported by Date is smaller than range of Number.
  c.LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_TIME =
    configObj.LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_TIME === '0'
      ? getMs('10000years')
      : getMs(configObj.LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_TIME || '30m');
  c.LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_COOLDOWN = getMs(configObj.LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_COOLDOWN || '15m');
  c.LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_LOCKOUT_MESSAGE =
    configObj.LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_LOCKOUT_MESSAGE ||
    'This account was locked due to excessive number of incorrect logins. Please contact the system administrator in order to unlock the account.';
  c.LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_COOLDOWN_MESSAGE =
    configObj.LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_COOLDOWN_MESSAGE ||
    'This account is temporarily disabled due to excessive number of invalid login attempts. Please try to login again later.';
  c.ACCOUNT_INACTIVITY_LOCKOUT_TIME = getMs(configObj.ACCOUNT_INACTIVITY_LOCKOUT_TIME || '90d');
  c.ACCOUNT_INACTIVITY_LOCKOUT_MESSAGE =
    configObj.ACCOUNT_INACTIVITY_LOCKOUT_MESSAGE ||
    'This account is locked due to a long period of inactivity. Please contact the system administrator to unlock your account';
  c.USER_MAX_SIMULTANEOUS_SESSIONS = castIntEnv(configObj.USER_MAX_SIMULTANEOUS_SESSIONS, 0);

  c.AIML_RUNNER_CONCURRENCY = castIntEnv(configObj.AIML_RUNNER_CONCURRENCY) || 1;
  c.AIML_CONCURRENT_REQUEST_NUMBER = castIntEnv(configObj.AIML_CONCURRENT_REQUEST_NUMBER) || 5;
  c.BPMN_RUNNER_CONCURRENCY = castIntEnv(configObj.BPMN_RUNNER_CONCURRENCY) || 1;
  c.BPMN_BATCH_SIZE = castIntEnv(configObj.BPMN_BATCH_SIZE) || 50;
  c.DMN_RUNNER_CONCURRENCY = castIntEnv(configObj.DMN_RUNNER_CONCURRENCY) || 1;
  c.DMN_BATCH_SIZE = castIntEnv(configObj.DMN_BATCH_SIZE) || 50;
  c.EXTERNAL_COMMANDS_RUNNER_CONCURRENCY = castIntEnv(configObj.EXTERNAL_COMMANDS_RUNNER_CONCURRENCY) || 1;
  c.SCG_RUNNER_CONCURRENCY = castIntEnv(configObj.SCG_RUNNER_CONCURRENCY) || 1;
  c.BULL_REMOVE_ON_COMPLETE =
    castBooleanEnv(configObj.BULL_REMOVE_ON_COMPLETE) || castIntEnv(configObj.BULL_REMOVE_ON_COMPLETE) || 10000;
  c.BULL_REMOVE_ON_FAIL =
    castBooleanEnv(configObj.BULL_REMOVE_ON_COMPLETE) || castIntEnv(configObj.BULL_REMOVE_ON_COMPLETE) || 10000;

  c.COOKIE_SECRET = configObj.COOKIE_SECRET || configObj.JWT_SECRET;
  c.COOKIE_SAME_SITE = getCookieSameSite(configObj.COOKIE_SAME_SITE);
  c.COOKIE_SECURE = configObj.COOKIE_SECURE === 'true';
  c.COOKIE_SIGNED = !!configObj.COOKIE_SECRET;

  c.AUDIT_LOG_MAX_RESPONSE_SIZE = castIntEnv(configObj.AUDIT_LOG_MAX_RESPONSE_SIZE, 10000);
  c.AUDIT_LOG_OPTIONS_REQUESTS = castBooleanEnv(configObj.AUDIT_LOG_OPTIONS_REQUESTS, false);
  c.AUDIT_LOG_HTTP_CONTENT_TYPES =
    configObj.AUDIT_LOG_HTTP_CONTENT_TYPES === 'all'
      ? []
      : castStringArrayEnv(configObj.AUDIT_LOG_HTTP_CONTENT_TYPES, ['json']);

  c.MFA_OTP_TOTP_TOKEN_LENGTH = castIntEnv(configObj.MFA_OTP_TOTP_TOKEN_LENGTH, 6);
  if (c.MFA_OTP_TOTP_TOKEN_LENGTH < 3 || c.MFA_OTP_TOTP_TOKEN_LENGTH > 8) {
    errors.push(
      `MFA_OTP_TOTP_TOKEN_LENGTH must be at least 3 and as max 8 (other lengths is not supported by Authy app)`
    );
  }
  c.MFA_OTP_HOTP_TOKEN_LENGTH = castIntEnv(configObj.MFA_OTP_HOTP_TOKEN_LENGTH, 8);
  c.MFA_OTP_MAX_TOKEN_ATTEMPTS = castIntEnv(configObj.MFA_OTP_MAX_TOKEN_ATTEMPTS, 3);
  c.MFA_OTP_BACKUP_CODES_NUMBER = castIntEnv(configObj.MFA_OTP_BACKUP_CODES_NUMBER, 10);
  c.MFA_OTP_MAX_FAILED_LOGIN_ATTEMPTS_TIME = castIntEnv(
    configObj.MFA_OTP_MAX_FAILED_LOGIN_ATTEMPTS_TIME,
    c.LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_TIME
  );
  c.MFA_OTP_MAX_FAILED_LOGIN_ATTEMPTS_COOLDOWN = castIntEnv(
    configObj.MFA_OTP_MAX_FAILED_LOGIN_ATTEMPTS_COOLDOWN,
    c.LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_COOLDOWN
  );
  c.MFA_REQUIRED = castBooleanEnv(configObj.MFA_REQUIRED, false);
  c.MFA_ENABLED = castBooleanEnv(configObj.MFA_ENABLED, true);
  if (c.MFA_REQUIRED && !c.MFA_ENABLED) {
    errors.push(`Value MFA_REQUIRED=true contradicts MFA_ENABLED=false.`);
  }

  c.ACCOUNT_FORCED_PASSWORD_CHANGE_TIME = getMs(configObj.ACCOUNT_FORCED_PASSWORD_CHANGE_TIME || '0');
  c.ACCOUNT_FORCED_PASSWORD_CHANGE_ENABLED = c.ACCOUNT_FORCED_PASSWORD_CHANGE_TIME > 0;
  c.ACCOUNT_FORCED_PASSWORD_CHANGE_REMEMBER_PASSWORDS = castIntEnv(
    configObj.ACCOUNT_FORCED_PASSWORD_CHANGE_REMEMBER_PASSWORDS,
    3
  );
  const days = _.round(c.ACCOUNT_FORCED_PASSWORD_CHANGE_TIME / 1000 / 60 / 60, 1);
  c.ACCOUNT_FORCED_PASSWORD_CHANGE_MESSAGE = `This application requires that you change your password every ${days} days. Please enter the new password`;
  c.ACCOUNT_FORCED_PASSWORD_CHANGE_DUPLICATE_PASSWORD_MESSAGE = `Password was previously used, please enter the new password.`;

  c.FILE_LINK_EXPIRES_IN = getMs(configObj.FILE_LINK_EXPIRES_IN || '1m');

  c.CREDENTIALS_PASSWORD = configObj.CREDENTIALS_PASSWORD && md5(configObj.CREDENTIALS_PASSWORD);

  c.DATA_EXPORT_INSTANT_DOWNLOAD_TIMEOUT = castIntEnv('DATA_EXPORT_INSTANT_DOWNLOAD_TIMEOUT') || 3000;
  c.DATA_EXPORT_INSTANT_DOWNLOADING_TIMEOUT_MESSAGE =
    configObj.DATA_EXPORT_INSTANT_DOWNLOADING_TIMEOUT_MESSAGE ||
    "This export is taking too long. Once it's completed you can download it from <URL>";

  c.TRINO_SCHEMA_GUESS_ROWS = castIntEnv('TRINO_SCHEMA_GUESS_ROWS') || 10;

  c.TRINO_URI = configObj.TRINO_URI;
  c.TRINO_CATALOG = configObj.TRINO_CATALOG;
  c.TRINO_SCHEMA = configObj.TRINO_SCHEMA;

  return { config: c, errors, warnings };
}

// All values are of string type
function getEnvConfig(envRecord) {
  const envObj = {};
  const envFieldsSchema = getEnvFieldsSchema();
  _.each(envFieldsSchema, (field, key) => {
    if (!_.isUndefined(field.default)) {
      envObj[key] = field.default;
    }
    if (field.canBeDefinedInEnvironment && !_.isUndefined(process.env[key])) {
      envObj[key] = process.env[key];
    }
    if (envRecord && field.canBeDefinedInDatabase && !_.isUndefined(envRecord[key])) {
      envObj[key] = envRecord[key];
    }
  });
  return envObj;
}

function getConfigMergedWithEnvRecord(envRecord, mongodbUri) {
  const envConfig = getEnvConfig(envRecord);
  if (mongodbUri) {
    envConfig.MONGODB_URI = mongodbUri;
  }
  const { config, errors, warnings } = getConfigFromObj(envConfig);
  return { config, errors, warnings, envConfig };
}

function prepareEnvironmentSchema(envSchema) {
  const envFieldsSchema = getEnvFieldsSchema();
  const preparedEnvFieldsSchema = _.merge({}, envSchema.fields, envFieldsSchema);
  _.each(preparedEnvFieldsSchema, (field) => {
    field.permissions = { read: 'viewEnvironment' };
    field.permissions.write = field.canBeDefinedInDatabase ? 'manageEnvironment' : PERMISSIONS.accessForbidden;
    field.visible = field.canBeDefinedInDatabase;
  });
  envSchema.fields = preparedEnvFieldsSchema;
}

function getNewConfig(newEnvRecord, previousEnvConfig) {
  // validate the whole new record
  const { errors: wholeConfigErrors } = getConfigMergedWithEnvRecord(newEnvRecord);
  if (!_.isEmpty(wholeConfigErrors)) {
    return { errors: wholeConfigErrors };
  }

  // build new config merging previous env params with env params not requiring restart
  const notRequiringRestartPart = {};
  const envFieldsSchema = getEnvFieldsSchema();
  _.each(envFieldsSchema, (envField, envFieldName) => {
    const value = newEnvRecord[envFieldName];
    if (!envField.requiresRestart && !_.isUndefined(value)) {
      notRequiringRestartPart[envFieldName] = value;
    }
  });
  const newEnvConfig = _.merge({}, previousEnvConfig, notRequiringRestartPart);
  const { config: newConfig, errors: newConfigErrors } = getConfigFromObj(newEnvConfig);
  if (!_.isEmpty(newConfigErrors)) {
    return { errors: newConfigErrors };
  }
  return { newConfig, newEnvConfig };
}

module.exports = {
  getSchemaNestedPaths,
  getAbsolutePath,
  getAbsolutePathsFromCommaSeparated,
  getEnvFieldsSchema,
  prepareEnvironmentSchema,
  getConfigFromDb,
  getConfigFromEnv,
  getEnvConfig,
  getNewConfig,
  appRoot,
};
