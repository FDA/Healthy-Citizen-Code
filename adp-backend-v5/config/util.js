const ms = require('ms');
const _ = require('lodash');
const nodePath = require('path');
const { md5 } = require('../lib/util/hash');
const { PERMISSIONS } = require('../lib/access/access-config');

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
  if (!envFieldsSchema) {
    // for now it's only current repo's adp.environment section in package.json
    envFieldsSchema = _.get(require('../package.json'), 'adp.environment', {});
  }

  return _.clone(envFieldsSchema);
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

  // Write all declared env params as is and then transform complicated ones
  const envFieldsSchema = getEnvFieldsSchema();
  _.each(envFieldsSchema, (field, key) => {
    c[key] = _.isUndefined(configObj[key]) ? '' : configObj[key];
  });

  c.APP_PORT = castIntEnv(configObj.APP_PORT, 8080);
  c.CREATE_INDEXES = castBooleanEnv(configObj.CREATE_INDEXES, true);
  c.DEVELOPMENT = castBooleanEnv(configObj.DEVELOPMENT, false);
  // Absolute paths are not error prone. Its being used in custom prototypes and tests
  c.LOG4JS_CONFIG = getAbsolutePath(appRoot, configObj.LOG4JS_CONFIG);
  c.APP_SCHEMA = configObj.APP_MODEL_DIR
    ? [getAbsolutePath(appRoot, configObj.APP_MODEL_DIR)]
    : getAbsolutePathsFromCommaSeparated(appRoot, configObj.APP_SCHEMA);

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

  c.CORS_ORIGIN = configObj.CORS_ORIGIN
    ? [RegExp(configObj.CORS_ORIGIN)]
    : [/https:\/\/.+\.conceptant\.com/, /http:\/\/localhost\.conceptant\.com.*/, /http:\/\/localhost.*/];
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

  c.EMAIL_PORT = castIntEnv(configObj.EMAIL_PORT);
  c.EMAIL_SECURE = castBooleanEnv(configObj.EMAIL_SECURE, false);
  c.EMAIL_POOL = castBooleanEnv(configObj.EMAIL_POOL, false);

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

  c.TRINO_SCHEMA_GUESS_ROWS = castIntEnv('TRINO_SCHEMA_GUESS_ROWS') || 10;

  c.DATA_EXPORT_INSTANT_DOWNLOAD_TIMEOUT = castIntEnv('DATA_EXPORT_INSTANT_DOWNLOAD_TIMEOUT') || 3000;
  c.DATA_EXPORT_INSTANT_DOWNLOADING_TIMEOUT_MESSAGE =
    process.env.DATA_EXPORT_INSTANT_DOWNLOADING_TIMEOUT_MESSAGE ||
    "This export is taking too long. Once it's completed you can download it from <URL>";

  c.DATA_EXPORT_INSTANT_DOWNLOAD_TIMEOUT = getMs(configObj.DATA_EXPORT_INSTANT_DOWNLOAD_TIMEOUT || '3s');

  c.HIDE_ERROR_MESSAGES_AFTER_LOGOUT_IN = getMs(configObj.HIDE_ERROR_MESSAGES_AFTER_LOGOUT_IN || '5s');

  return { config: c, errors, warnings };
}

function getDevEnvInfo() {
  const c = {};

  c.APP_PORT = { required: false, type: 'Number' };
  c.API_URL = { required: true, type: 'String' };
  c.JWT_SECRET = { required: true, type: 'String' };
  c.MONGODB_URI = { required: true, type: 'String' };
  c.APP_NAME = { required: true, type: 'String' };
  c.APP_VERSION = { required: false, type: 'String' };
  c.CREATE_INDEXES = { required: false, type: 'Boolean' };
  c.DEVELOPMENT = { required: false, type: 'Boolean' };
  c.LOG4JS_CONFIG = { required: false, type: 'String' };
  c.APP_SCHEMA = { required: false, type: 'String' };

  c.REDIS_URL = { required: false, type: 'String' };
  c.REDIS_KEY_PREFIX = { required: false, type: 'String' };
  c.BULL_REDIS_URL = { required: false, type: 'String' };
  c.BULL_KEY_PREFIX = { required: false, type: 'String' };
  c.SESSIONS_REDIS_URL = { required: false, type: 'String' };
  c.SESSIONS_KEY_PREFIX = { required: false, type: 'String' };
  c.SOCKETIO_REDIS_URL = { required: false, type: 'String' };
  c.SOCKETIO_KEY_PREFIX = { required: false, type: 'String' };

  c.APP_SUFFIX = { required: false, type: 'String' };
  c.API_PREFIX = { required: false, type: 'String' };
  c.RESOURCE_PREFIX = { required: false, type: 'String' };
  c.FRONTEND_URL = { required: true, type: 'String' };
  c.CORS_ORIGIN = { required: false, type: 'String' };
  c.GOOGLE_API_KEY = { required: false, type: 'String' };
  c.DATASET_RESOLVERS_EXPIRATION_TIME = { required: false, type: 'String(ms format) or Number' };
  c.LOG_DB_URI = { required: false, type: 'String' };
  c.LOG_DB_COLLECTION = { required: false, type: 'String' };
  c.ES_NODES = { required: false, type: 'Comma-separated String' };
  c.ES_MAX_RETRIES = { required: false, type: 'Number' };
  c.BUILD_APP_MODEL_CODE_ON_START = { required: false, type: 'Boolean' };
  c.USE_FARMHASH = { required: false, type: 'Boolean' };
  c.SEND_RTC_ON_MONGODB_CHANGE = { required: false, type: 'Boolean' };
  c.USER_SESSION_ID_TIMEOUT = { required: false, type: 'String(ms format) or Number' };

  c.RESET_PASSWORD_TOKEN_EXPIRES_IN = { required: false, type: 'String(ms format) or Number' };
  c.JWT_ACCESS_TOKEN_EXPIRES_IN = { required: false, type: 'String(ms format) or Number' };
  c.JWT_REFRESH_TOKEN_EXPIRES_IN = { required: false, type: 'String(ms format) or Number' };

  c.EMAIL_HOST = { required: 'Yes if EMAIL_SERVICE is not specified', type: 'String' };
  c.EMAIL_PORT = { required: 'Yes if EMAIL_SERVICE is not specified', type: 'Number' };
  c.EMAIL_SECURE = { required: false, type: 'Boolean' };
  c.EMAIL_POOL = { required: false, type: 'Boolean' };
  c.EMAIL_CREDENTIALS = { required: true, type: 'String' };
  c.EMAIL_SERVICE = { required: 'Yes if EMAIL_HOST and EMAIL_PORT are not specified', type: 'String' };

  c.INACTIVITY_LOGOUT_NOTIFICATION_APPEARS_IN = { required: false, type: 'String(ms format) or Number' };
  c.INACTIVITY_LOGOUT_IN = { required: false, type: 'String(ms format) or Number' };

  c.INACTIVITY_LOGOUT_REMEMBER_OLD_TOKEN_FOR = { required: false, type: 'String(ms format) or Number' };
  c.INACTIVITY_LOGOUT_FE_PING_INTERVAL = { required: false, type: 'String(ms format) or Number' };

  c.LOGIN_MAX_FAILED_LOGIN_ATTEMPTS = { required: false, type: 'Number' };
  c.LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_TIME = { required: false, type: 'String(ms format) or Number' };
  c.LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_COOLDOWN = { required: false, type: 'String(ms format) or Number' };
  c.LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_LOCKOUT_MESSAGE = { required: false, type: 'String' };
  c.LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_COOLDOWN_MESSAGE = { required: false, type: 'String' };
  c.ACCOUNT_INACTIVITY_LOCKOUT_TIME = { required: false, type: 'String(ms format) or Number' };
  c.ACCOUNT_INACTIVITY_LOCKOUT_MESSAGE = { required: false, type: 'String' };
  c.USER_MAX_SIMULTANEOUS_SESSIONS = { required: false, type: 'Number' };

  c.AIML_RUNNER_CONCURRENCY = { required: false, type: 'Number' };
  c.AIML_CONCURRENT_REQUEST_NUMBER = { required: false, type: 'Number' };
  c.BPMN_RUNNER_CONCURRENCY = { required: false, type: 'Number' };
  c.BPMN_BATCH_SIZE = { required: false, type: 'Number' };
  c.DMN_RUNNER_CONCURRENCY = { required: false, type: 'Number' };
  c.DMN_BATCH_SIZE = { required: false, type: 'Number' };
  c.EXTERNAL_COMMANDS_RUNNER_CONCURRENCY = { required: false, type: 'Number' };
  c.SCG_RUNNER_CONCURRENCY = { required: false, type: 'Number' };
  c.BULL_REMOVE_ON_COMPLETE = { required: false, type: 'Boolean or Number' };
  c.BULL_REMOVE_ON_FAIL = { required: false, type: 'Boolean or Number' };

  c.COOKIE_SECRET = { required: false, type: 'String' };
  c.COOKIE_SAME_SITE = { required: false, type: 'Boolean or String' };
  c.COOKIE_SECURE = { required: false, type: 'Boolean' };

  c.AUDIT_LOG_MAX_RESPONSE_SIZE = { required: false, type: 'Number' };
  c.AUDIT_LOG_OPTIONS_REQUESTS = { required: false, type: 'Boolean' };
  c.AUDIT_LOG_HTTP_CONTENT_TYPES = { required: false, type: 'Comma-separated String' };

  c.MFA_OTP_TOTP_TOKEN_LENGTH = { required: false, type: 'Number' };
  c.MFA_OTP_HOTP_TOKEN_LENGTH = { required: false, type: 'Number' };
  c.MFA_OTP_MAX_TOKEN_ATTEMPTS = { required: false, type: 'Number' };
  c.MFA_OTP_BACKUP_CODES_NUMBER = { required: false, type: 'Number' };
  c.MFA_OTP_MAX_FAILED_LOGIN_ATTEMPTS_TIME = { required: false, type: 'Number' };
  c.MFA_OTP_MAX_FAILED_LOGIN_ATTEMPTS_COOLDOWN = { required: false, type: 'Number' };
  c.MFA_REQUIRED = { required: false, type: 'Boolean' };
  c.MFA_ENABLED = { required: false, type: 'Boolean' };
  c.ACCOUNT_FORCED_PASSWORD_CHANGE_TIME = { required: false, type: 'String(ms format) or Number' };
  c.ACCOUNT_FORCED_PASSWORD_CHANGE_REMEMBER_PASSWORDS = { required: false, type: 'Number' };
  c.FILE_LINK_EXPIRES_IN = { required: false, type: 'String(ms format) or Number' };
  c.CREDENTIALS_PASSWORD = { required: false, type: 'String' };
  c.TRINO_SCHEMA_GUESS_ROWS = { required: false, type: 'Number' };
  c.TRINO_URI = { required: false, type: 'String' };
  c.TRINO_CATALOG = { required: false, type: 'String' };
  c.TRINO_SCHEMA = { required: false, type: 'String' };

  c.DATA_EXPORT_INSTANT_DOWNLOAD_TIMEOUT = { required: false, type: 'Number' };
  c.DATA_EXPORT_INSTANT_DOWNLOADING_TIMEOUT_MESSAGE = { required: false, type: 'String' };
  c.DATA_EXPORT_INSTANT_DOWNLOAD_TIMEOUT = { required: false, type: 'String(ms format) or Number' };
  c.HIDE_ERROR_MESSAGES_AFTER_LOGOUT_IN = { required: false, type: 'String(ms format) or Number' };

  c.TERMINAL_DISABLE_PRESETS = { required: false, type: 'Comma-separated String' };

  return c;
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
  const envFieldsSchema = _.merge({}, envSchema.fields, getEnvFieldsSchema());

  const envFieldsEntries = _.entries(envFieldsSchema);
  envFieldsEntries.sort((a, b) => {
    const [fieldNameA, { group: groupA = '' }] = a;
    const [fieldNameB, { group: groupB = '' }] = b;

    const groupCompare = groupA.localeCompare(groupB);
    if (groupCompare !== 0) {
      return groupCompare;
    }
    return fieldNameA.localeCompare(fieldNameB);
  });

  const preparedEnvFieldsSchema = {};
  let currentGroup = null;
  _.each(envFieldsEntries, ([fieldName, field]) => {
    field.formWidth = 6;
    field.permissions = { read: 'accessSystemEnvironmentVariables' };
    field.permissions.write = field.canBeDefinedInDatabase
      ? 'manageSystemEnvironmentVariables'
      : PERMISSIONS.accessForbidden;
    field.visible = field.canBeDefinedInDatabase;

    const group = field.group || 'Params Without Group';
    if (field.visible && currentGroup !== group) {
      currentGroup = group;
      const groupFieldName = `group${_.upperFirst(_.camelCase(group))}`;
      preparedEnvFieldsSchema[groupFieldName] = {
        type: 'Group',
        fullName: group,
      };
    }

    preparedEnvFieldsSchema[fieldName] = field;
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

function getFrontendConfig(wholeConfig) {
  const includeWithBuildSchemaParams = [];
  _.each(getEnvFieldsSchema(), (val, key) => {
    if (val.includeWithBuildSchema === true) {
      includeWithBuildSchemaParams.push(key);
    }
  });
  return _.pick(wholeConfig, includeWithBuildSchemaParams);
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
  getFrontendConfig,
  getDevEnvInfo,
  appRoot,
};
