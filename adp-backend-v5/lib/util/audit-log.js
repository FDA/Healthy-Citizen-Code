const ms = require('ms');
const _ = require('lodash');

const { ObjectId } = require('mongodb');
const Url = require('url-parse');
const rfdc = require('rfdc');
const isArrayBuffer = require('is-array-buffer');
const isBuffer = require('is-buffer');
const isStream = require('is-stream');
const stringifySafe = require('json-stringify-safe');

const { is: getAllowedContentType } = require('type-is');
const { parse } = require('graphql');
const { asyncLocalStorage } = require('../async-local-storage');

const { stringifyLog } = require('./util');
const { startAtSymbol, startAtDateSymbol } = require('./middlewares/response-time');
const { getDuration } = require('./measure');
const { getOptionsToLog } = require('./mongo');

const auditLoggerTypes = ['http', 'db', 'auth', 'security', 'system'];
const clone = rfdc({ proto: false, circles: false });

function getAuditLoggers(log4js, config) {
  const loggers = {};
  const logAuditRecordFuncs = getLogAuditRecordFuncs(config);

  _.each(logAuditRecordFuncs, (getRecordFunc, auditType) => {
    const log4jsLogger = log4js.getLogger(auditType);
    const isLoggerEnabled = log4jsLogger.isLevelEnabled('info');
    if (isLoggerEnabled) {
      loggers[auditType] = (...args) => {
        const record = getRecordFunc(...args);
        if (record) {
          log4jsLogger.info(record);
        }
      };
    } else {
      loggers[auditType] = _.noop;
    }
  });
  return loggers;
}

function isLogHttpAudit({ req, res, AUDIT_LOG_OPTIONS_REQUESTS, AUDIT_LOG_HTTP_CONTENT_TYPES }) {
  const method = req.method.toLowerCase();
  if (!AUDIT_LOG_OPTIONS_REQUESTS && method === 'options') {
    return false;
  }

  const contentTypeHeader = res.getHeader('content-type');
  if (contentTypeHeader && !_.isEmpty(AUDIT_LOG_HTTP_CONTENT_TYPES)) {
    const allowedContentType = getAllowedContentType(contentTypeHeader, AUDIT_LOG_HTTP_CONTENT_TYPES);
    if (!allowedContentType) {
      return false;
    }
  }
  return true;
}

function getLogAuditRecordFuncs(config) {
  return {
    auth: ({ message, req, user }) => ({
      type: 'auth',
      message,
      clientIp: req.ip,
      requestId: req.id,
      sessionId: req.sessionID,
      timestamp: new Date(),
      duration: getReqDuration(req),
      user: getUserLookup(user),
    }),
    security: ({ message, req, user }) => ({
      type: 'security',
      message,
      clientIp: req.ip,
      requestId: req.id,
      sessionId: req.sessionID,
      timestamp: new Date(),
      duration: getReqDuration(req),
      user: getUserLookup(user),
    }),
    http: ({ req, res }) => {
      const { AUDIT_LOG_OPTIONS_REQUESTS, AUDIT_LOG_HTTP_CONTENT_TYPES } = config;
      if (!isLogHttpAudit({ req, res, AUDIT_LOG_OPTIONS_REQUESTS, AUDIT_LOG_HTTP_CONTENT_TYPES })) {
        return;
      }

      const message = getAppMessage(req, res);
      const parsedRequest = getParsedRequest({ req, res, config });
      return {
        type: 'http',
        message,
        clientIp: req.ip,
        requestId: req.id,
        sessionId: req.sessionID,
        user: getUserLookup(req.user),
        data: parsedRequest,
        query: parsedRequest.request.query,
        method: parsedRequest.request.method,
        duration: parsedRequest.duration,
        timestamp: new Date(parsedRequest.timestamp),
      };
    },
    db: getDbLogRecord,
    system: ({ message }) => ({
      type: 'system',
      message,
      timestamp: new Date(),
    }),
  };
}

function getAppMessage(req, res) {
  const { method, url } = req;
  const { statusCode } = res;
  const responseTimeHeader = res.getHeader('x-response-time');
  const responseTime = responseTimeHeader ? `${ms(responseTimeHeader)}ms` : null;
  const contentLengthHeader = res.getHeader('content-length');

  const contentLength = contentLengthHeader ? `${contentLengthHeader}bytes` : null;
  return [method, url, statusCode, contentLength, responseTime].filter((i) => i).join(' ');
}

function getUserLookup(user) {
  if (!user) {
    return null;
  }
  const { _id, login, email } = user;
  return {
    _id: _id ? _id.toString() : undefined,
    table: 'users',
    label: login,
    data: {
      email,
    },
  };
}

function maskSpecialTypes(obj, options = {}) {
  const { maskBuffers = true, maskStreams = true } = options;
  if (typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    const arr = [];
    for (let i = 0; i < obj.length; i++) {
      const element = obj[i];
      arr[i] = maskSpecialTypes(element, options);
    }
    return arr;
  }
  if (ObjectId.isValid(obj)) {
    return obj.toString();
  }
  if (maskStreams && isStream(obj)) {
    return { type: 'Stream' };
  }

  if (maskBuffers) {
    if (isBuffer(obj)) {
      return { type: 'Buffer', byteLength: obj.byteLength };
    }
    if (isArrayBuffer(obj)) {
      return { type: 'ArrayBuffer', byteLength: obj.byteLength };
    }
  }

  const masked = {};
  for (const key in obj) {
    if (typeof obj[key] === 'object') {
      if (Array.isArray(obj[key])) {
        masked[key] = maskSpecialTypes(obj[key], options);
      } else if (maskStreams && isStream(obj[key])) {
        masked[key] = { type: 'Stream' };
      } else if (maskBuffers && isBuffer(obj[key])) {
        masked[key] = { type: 'Buffer', byteLength: obj[key].byteLength };
      } else if (maskBuffers && isArrayBuffer(obj[key])) {
        masked[key] = { type: 'ArrayBuffer', byteLength: obj[key].byteLength };
      } else {
        masked[key] = maskSpecialTypes(obj[key], options);
      }
    } else {
      masked[key] = obj[key];
    }
  }

  return masked;
}

function getParsedRequest({ req, res, config, options = {} }) {
  const start = process.hrtime.bigint();
  const id = new ObjectId();

  const { method } = req;
  const originalUrl = req.originalUrl || req.url;
  let query;
  let absoluteUrl;
  if (originalUrl) {
    const { origin, pathname, query: q } = new Url(originalUrl, {}); // parse query, path, and origin to prepare absolute Url
    query = Url.qs.parse(q);
    const path = origin === 'null' ? pathname : ''.concat(origin).concat(pathname);
    const qs = Url.qs.stringify(query, true);
    absoluteUrl = path + qs;
  }

  const user = { ip_address: req.ip };

  let body = clone(req.body);
  const { maskBuffers = true, maskStreams = true } = options;
  const maskSpecialTypesOptions = { maskBuffers, maskStreams };
  if (!['GET', 'HEAD'].includes(method) && !_.isUndefined(body)) {
    if (maskBuffers || maskStreams) {
      body = maskSpecialTypes(body, maskSpecialTypesOptions);
    }
  }

  const cookies = clone(req.cookies);
  delete cookies.refresh_token;

  const requestHeaders = clone(req.headers);
  // if (requestHeaders.authorization) {
  //   const [authScheme = '', token = ''] = requestHeaders.authorization.split(' ');
  //   if (authScheme.toLowerCase() === 'jwt') {
  //     requestHeaders.authorization = `${authScheme} ${'*'.repeat(token.length)}`;
  //   }
  // }

  const result = {
    id: id.toString(),
    timestamp: id.getTimestamp().toISOString(),
    duration: getReqDuration(req),
    requestId: req.id,
    request: {
      id: req.id,
      method,
      headers: requestHeaders,
      cookies,
      url: absoluteUrl,
      user,
      query,
      body,
      timestamp: req[startAtDateSymbol] instanceof Date ? req[startAtDateSymbol].toISOString() : null,
    },
    response: { headers: res.getHeaders() },
  };

  if (typeof req.file === 'object') {
    result.request.file = stringifySafe(clone(maskSpecialTypes(req.file, maskSpecialTypesOptions)));
  }
  if (typeof req.files === 'object') {
    result.request.files = stringifySafe(clone(maskSpecialTypes(req.files, maskSpecialTypesOptions)));
  }

  if (_.isString(res.body)) {
    // fulfilled res.body comes from middleware
    result.response.body = res.body;
  }

  const { API_PREFIX } = config;
  const graphqlQuery = _.get(body, 'query');
  if (req.url === `${API_PREFIX}/graphql` && graphqlQuery) {
    try {
      const parsedQuery = parse(graphqlQuery);
      const resolverName = _.get(parsedQuery, 'definitions.0.selectionSet.selections.0.name.value');
      if (resolverName === '_credentialsUpdateOne' || resolverName === '_credentialsCreate') {
        const record = _.get(body, 'variables.record', {});
        if (record.type === 'basic') {
          record.login = '******';
          record.password = '******';
        }
      } else if (resolverName === '_usersUpdateOne' || resolverName === '_usersCreate') {
        const record = _.get(body, 'variables.record', {});
        record.password = '******';
      }
    } catch (e) {
      // parse error, continue
    }
  }
  result.parseDuration = getDuration(start);
  return result;
}

function getDbLogRecord({ args, result, duration, timestamp }) {
  const [collection, method] = args;
  const alsStore = asyncLocalStorage.getStore() || {};
  const { clientIp, requestId, sessionId } = alsStore;

  const baseRecord = {
    type: 'db',
    duration,
    timestamp,
    method,
    collection,
    query: {},
    options: {},
    clientIp,
    requestId,
    sessionId,
    user: getUserLookup(alsStore.user),
    ...getAffectedRecordsInfo(),
  };
  if (args.length === 2) {
    return {
      ...baseRecord,
      message: getMsgWithDuration(`${method} ${collection}`),
    };
  }
  if (args.length === 3) {
    const query = args[2];
    return {
      ...baseRecord,
      message: getMsgWithDuration(`${method} ${collection}, ${stringifyLog(query)}`),
      query,
    };
  }
  if (args.length === 4) {
    const doc = args[2];
    const options = getOptionsToLog(args[3]);
    const _doc = stringifyLog(doc);
    const stringifiedOptions = stringifyLog(options);
    return {
      ...baseRecord,
      message: getMsgWithDuration(`${method} ${collection}, ${_doc}, OPTIONS:${stringifiedOptions}`),
      options,
    };
  }
  if (args.length === 5) {
    const query = args[2];
    const doc = args[3];
    const options = getOptionsToLog(args[4]);
    const _doc = _.isArray(doc) ? [] : stringifyLog(doc);
    return {
      ...baseRecord,
      message: getMsgWithDuration(
        `${method} ${collection}, ${stringifyLog(query)}, ${_doc}, OPTIONS:${stringifyLog(options)}`
      ),
      query,
      options,
    };
  }

  return {
    message: stringifyLog(args),
    collection: null,
    query: null,
    options: null,
    records: [],
  };
  function getMsgWithDuration(msg) {
    return duration ? `${msg}, ${duration}ms` : msg;
  }
  function getAffectedRecordsInfo() {
    if (method === 'insertMany') {
      return { records: _.values(result.insertedIds) };
    }
    if (method === 'insertOne') {
      return { records: [result.insertedId] };
    }
    if (method === 'replaceOne') {
      const docs = result.ops || [];
      return { records: docs.map((d) => d._id) };
    }
    if (['updateMany', 'updateOne'].includes(method)) {
      const upsertedId = _.get(result, 'upsertedId._id');
      if (upsertedId) {
        return { records: [upsertedId] };
      }
      return { nModified: result.result.nModified };
    }
    if (method === 'findOne') {
      return {};
    }
    if (['findOneAndDelete', 'findOneAndReplace', 'findOneAndUpdate'].includes(method)) {
      const id = _.get(result, 'value._id');
      return { records: id ? [id] : [] };
    }
    return {};
  }
}

function getReqDuration(req) {
  const startHrTime = req[startAtSymbol];
  const diffHrtime = process.hrtime(startHrTime);
  const milliseconds = diffHrtime[0] * 1e3 + diffHrtime[1] / 1e6;
  return _.round(milliseconds, 1);
}

function getHttpAuditMiddleware(config) {
  const { AUDIT_LOG_OPTIONS_REQUESTS, AUDIT_LOG_HTTP_CONTENT_TYPES, AUDIT_LOG_MAX_RESPONSE_SIZE } = config;

  return (req, res, next) => {
    let isLogEnabled = null;

    const defaultWrite = res.write;
    const defaultEnd = res.end;
    let body = '';

    res.write = (...restArgs) => {
      if (isLogEnabled === null) {
        isLogEnabled = isLogHttpAudit({ req, res, AUDIT_LOG_OPTIONS_REQUESTS, AUDIT_LOG_HTTP_CONTENT_TYPES });
      }
      if (isLogEnabled && body.length < AUDIT_LOG_MAX_RESPONSE_SIZE) {
        body += Buffer.from(restArgs[0]).toString('utf-8');
      }
      defaultWrite.apply(res, restArgs);
    };

    res.end = (...restArgs) => {
      if (isLogEnabled) {
        if (restArgs[0] && body.length < AUDIT_LOG_MAX_RESPONSE_SIZE) {
          body += Buffer.from(restArgs[0]).toString('utf-8');
        }
        res.body = body.substring(0, AUDIT_LOG_MAX_RESPONSE_SIZE);
      }

      defaultEnd.apply(res, restArgs);
    };

    next();
  };
}

module.exports = {
  getAuditLoggers,
  auditLoggerTypes,
  getHttpAuditMiddleware,
};
