// Adds hooks and logs for Collection methods
const mongodb = require('mongodb');
const Promise = require('bluebird');
const _ = require('lodash');
const { handleResult } = require('./util/util');
const { measureFuncDuration } = require('./util/measure');
const { asyncLocalStorage } = require('./async-local-storage');

function addHooks() {
  const writeMethods = [
    'bulkWrite',
    'deleteMany',
    'deleteOne',
    'findAndModify',
    'findOneAndUpdate',
    'findOneAndDelete',
    'findOneAndRemove',
    'findOneAndReplace',
    'insert',
    'insertMany',
    'insertOne',
    'remove',
    'replaceOne',
    'save',
    'update',
    'updateMany',
    'updateOne',
  ];

  // init storage for all hooks of different methods
  mongodb.Collection.prototype.hooks = {};

  function getHookPath(namespace, stage, method) {
    return [namespace.collection, stage, method];
  }

  function addHookForStage(stage, method, callback) {
    const hookPath = getHookPath(this.s.namespace, stage, method);
    const stageMethodHooks = _.get(this.hooks, hookPath, []);
    stageMethodHooks.push(callback);
    _.set(this.hooks, hookPath, stageMethodHooks);
  }

  mongodb.Collection.prototype.before = function (method, callback) {
    if (method === 'write') {
      _.each(writeMethods, (writeMethod) => {
        addHookForStage.call(this, 'before', writeMethod, callback);
      });
      return;
    }
    addHookForStage.call(this, 'before', method, callback);
  };

  mongodb.Collection.prototype.after = function (method, callback) {
    if (method === 'write') {
      _.each(writeMethods, (writeMethod) => {
        addHookForStage.call(this, 'after', writeMethod, callback);
      });
      return;
    }
    addHookForStage.call(this, 'after', method, callback);
  };

  function processOpResult(method, opResult) {
    if (method === 'updateOne') {
      return { opResult };
    }
    if (['replaceOne', 'insertOne'].includes(method)) {
      return { record: opResult.ops[0], opResult };
    }
    if (method === 'findOne') {
      return { record: opResult, opResult };
    }
    if (['findOneAndDelete', 'findOneAndReplace', 'findOneAndUpdate'].includes(method)) {
      return { record: opResult.value, opResult };
    }
    if (method === 'find') {
      return { records: opResult, opResult };
    }
    return { opResult };
  }

  mongodb.Collection.prototype.hookQuery = async function (method, ...args) {
    const beforeHooks = _.get(this.hooks, getHookPath(this.s.namespace, 'before', method));
    const alsStore = asyncLocalStorage.getStore() || {};
    const login = _.get(alsStore, 'user.login');
    if (!_.isEmpty(beforeHooks)) {
      await Promise.mapSeries(beforeHooks, function (hook) {
        return hook.call(this, { args, method, login });
      });
    }

    const result = await this[method].call(this, ...args);

    const processedResult = processOpResult(method, result);

    const afterHooks = _.get(this.hooks, getHookPath(this.s.namespace, 'after', method));
    if (!_.isEmpty(afterHooks)) {
      await Promise.mapSeries(afterHooks, function (hook) {
        return hook.call(this, { args, method, result: processedResult, login });
      });
    }

    return processedResult;
  };
}

function addLogsForMethods(log, logCollectionName, logIgnoreMethods) {
  const allMethods = [
    'aggregate',
    'bulkWrite',
    'count',
    'countDocuments',
    'createIndex',
    'createIndexes',
    'deleteMany',
    'deleteOne',
    'distinct',
    'drop',
    'dropAllIndexes',
    'dropIndex',
    'dropIndexes',
    'ensureIndex',
    'estimatedDocumentCount',
    'find',
    'findAndModify',
    'findAndRemove',
    'findOne',
    'findOneAndDelete',
    'findOneAndReplace',
    'findOneAndUpdate',
    'geoHaystackSearch',
    'group',
    'indexes',
    'indexExists',
    // 'indexInformation',
    // 'initializeOrderedBulkOp',
    // 'initializeUnorderedBulkOp',
    'insert',
    'insertMany',
    'insertOne',
    'isCapped',
    // 'listIndexes',
    'mapReduce',
    'options',
    'parallelCollectionScan',
    'reIndex',
    'remove',
    'rename',
    'replaceOne',
    'save',
    'stats',
    'update',
    'updateMany',
    'updateOne',
    'watch',
  ];
  const methodsToLog = _.without(allMethods, ...logIgnoreMethods);

  _.each(allMethods, (method) => {
    addLogsForMethod(method);
  });
  wrapToArrayMethod();

  function wrapToArrayMethod() {
    const originalMethod = mongodb.Cursor.prototype.toArray;
    const wrappedMethod = measureFuncDuration(originalMethod);

    const handler = function (funcResult) {
      const { result, duration, timestamp } = funcResult;

      const isCursor = this instanceof mongodb.Cursor;
      const isCommandCursor = this instanceof mongodb.CommandCursor;
      const isAggregationCursor = this instanceof mongodb.AggregationCursor;

      const method = _.lowerFirst(_.replace(this.operation.constructor.name, 'Operation', ''));
      let args;

      if (isCommandCursor) {
        // For now do not log command cursors
        // if (method === 'listIndexes') {
        //   const collectionName = this.operation.collectionNamespace.collection;
        //   const { options } = this.operation;
        //   args = [collectionName, method, {}, options];
        // } else if (method === 'listCollections') {
        //   const query = this.operation.filter;
        //   const { options } = this.operation;
        //   args = ['', method, query, {}, options];
        // }
        return result;
      }

      if (isAggregationCursor) {
        const collectionName = this.operation.target;
        const { options } = this.operation;
        const query = this.operation.pipeline;
        args = [collectionName, method, query, [], options];
      } else if (isCursor) {
        if (method === 'find') {
          const collectionName = this.operation.ns.collection;
          const { limit, skip, query } = this.operation.cmd;
          const options = { limit, skip };
          args = [collectionName, method, query, result, options];
        }
      }

      const isLoggerEnabled = methodsToLog.includes(method);
      if (isLoggerEnabled) {
        log({ args, result, duration, timestamp });
      }

      return result;
    };

    mongodb.Cursor.prototype.toArray = function (...args) {
      const res = wrappedMethod.apply(this, args);
      return handleResult.call(this, res, handler);
    };
  }

  function addLogsForMethod(method) {
    const originalMethod = mongodb.Collection.prototype[method];
    if (!_.isFunction(originalMethod)) {
      return;
    }

    const wrappedMethod = measureFuncDuration(originalMethod);

    mongodb.Collection.prototype[method] = function (...args) {
      const { collection } = this.s.namespace;
      const lastArg = _.last(args);
      const extendedArgs = [collection, method];
      const hasCallback = _.isFunction(lastArg);
      if (hasCallback) {
        extendedArgs.push(...args.slice(-1));
      } else {
        extendedArgs.push(...args);
      }

      try {
        const res = wrappedMethod.apply(this, args);

        const handler = (funcResult) => {
          const { result, duration, timestamp } = funcResult;

          // Logging into log collection creates a recursion
          const isLogCollection = collection === logCollectionName;

          // Do not log operations retrieving a cursor since it's fast
          // We are interested in duration of cursor.toArray() (it's covered in wrapToArrayMethod)
          const isCursorResult = result instanceof mongodb.Cursor;

          const isLoggableMethod = methodsToLog.includes(method);

          const isLoggerEnabled = !isLogCollection && !isCursorResult && isLoggableMethod;

          if (isLoggerEnabled) {
            log({ args: extendedArgs, result, duration, timestamp });
          }

          return result;
        };

        return handleResult(res, handler);
      } catch (error) {
        // Collection operation may throw because of max bson size, catch it here
        // The cause is investigated here - https://github.com/Automattic/mongoose/issues/3906
        if (hasCallback) {
          lastArg(error);
        } else {
          throw error;
        }
      }
    };
  }
}

module.exports = (options) => {
  const defaultLogIgnoreMethods = ['createIndex', 'createIndexes', 'ensureIndex', 'indexInformation', 'listIndexes'];
  const { log, logCollectionName, logIgnoreMethods = defaultLogIgnoreMethods } = options;
  addLogsForMethods(log, logCollectionName, logIgnoreMethods);
  addHooks();

  return mongodb;
};
