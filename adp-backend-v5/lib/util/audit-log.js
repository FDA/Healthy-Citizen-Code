const ms = require('ms');
const _ = require('lodash');
const parseRequest = require('parse-request');

const startAt = Symbol.for('request-received.startAt');
const onFinished = require('on-finished');
const { stringifyLog } = require('./util');
const { getOptionsToLog } = require('./mongo');

const { asyncLocalStorage } = require('../async-local-storage');

const defaultRequestLogOptions = { isLogOptionsRequests: true, ignoredContentTypes: [], maxResponseBodySize: 10000 };

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

function getParsedRequest(req, res, maxResponseBodySize) {
  const parsedRequest = parseRequest({
    req,
    responseHeaders: res.getHeaders(),
    userFields: ['ip_address'],
  });
  parsedRequest.requestId = req.id;
  if (_.isString(res.body)) {
    parsedRequest.response.body = res.body.substring(0, maxResponseBodySize);
  }

  return parsedRequest;
}

function requestLogMiddleware({ appLogger, persistLogger, opts = {} }) {
  const options = _.merge({}, defaultRequestLogOptions, opts);

  return (req, res, next) => {
    onFinished(res, function (err) {
      if (err) {
        return appLogger.error(err);
      }

      let level = 'info';
      if (res.statusCode >= 500) {
        level = 'error';
      } else if (res.statusCode >= 400) {
        level = 'warn';
      }

      const message = getAppMessage(req, res);
      const parsedRequest = getParsedRequest(req, res, options.maxResponseBodySize);

      appLogger[level](message, parsedRequest);

      const method = req.method.toLowerCase();
      if (!options.isLogOptionsRequests && method === 'options') {
        return;
      }

      const contentType = (res.getHeader('content-type') || '').toLowerCase().split(';')[0];
      if (options.ignoredContentTypes.includes(contentType)) {
        return;
      }

      const record = {
        type: 'http',
        message,
        clientIp: req.ip,
        requestId: req.id,
        sessionId: req.sessionID,
        user: getUserLookup(req.user),
        data: parsedRequest,
        query: parsedRequest.request.query,
        method: parsedRequest.request.method,
        duration: parsedRequest.response.duration,
        timestamp: parsedRequest.timestamp,
      };
      persistLogger[level](record);
    });

    return next();
  };
}

function dbLog({ args, result, duration, timestamp, appLogger, persistLogger, isPersistLoggerEnabled = true }) {
  const level = 'info';

  const dbLogRecord = getDbLogRecord({ args, result, duration, timestamp });
  appLogger[level](dbLogRecord.message);
  if (isPersistLoggerEnabled) {
    persistLogger[level](dbLogRecord);
  }
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
  const startHrTime = req[startAt];
  const diffHrtime = process.hrtime(startHrTime);
  const milliseconds = diffHrtime[0] * 1e3 + diffHrtime[1] / 1e6;
  return _.round(milliseconds, 1);
}

module.exports = {
  requestLogMiddleware,
  dbLog,
  getUserLookup,
  getReqDuration,
};
