const _ = require('lodash');
const Promise = require('bluebird');
const log = require('log4js').getLogger('mongodb-changes');
const { getSiftFilteringFunc } = require('../../lib/util/sift');

const mongoDbChangeEvent = 'mongoDbChange';

module.exports = () => {
  const m = {};

  m.init = async (appLib) => {
    m.appLib = appLib;

    if (process.env.SEND_RTC_ON_MONGODB_CHANGE !== 'true') {
      return;
    }

    addMongoDbChangeEvent();
    m.addHooks();
  };

  // eslint-disable-next-line no-unused-vars
  async function getTransformedRecord(
    appModel,
    userPermissions,
    inlineContext,
    actionsToPut,
    record,
    modelName,
    userContext
  ) {
    const actionFuncsMeta = await m.appLib.accessUtil.getActionFuncsMeta(
      appModel,
      userPermissions,
      inlineContext,
      actionsToPut
    );
    const { actionFuncs } = actionFuncsMeta;
    const docs = [record];
    const docsWithActions = m.appLib.accessUtil.addActionsToDocs(docs, actionFuncs);
    await m.appLib.dba.postTransform(docsWithActions, modelName, userContext);
    return docsWithActions[0];
  }

  function addMongoDbChangeEvent() {
    m.appLib.ws.addEvent(mongoDbChangeEvent, {
      async hook({ record, args, modelName, method, login }) {
        const ioNamespace = this;
        const appModel = m.appLib.appModel.models[modelName];

        const recordChange = getRecordChange(method, args);

        if (!recordChange) {
          return log.warn(`Unable to determine record change for method ${method}`);
        }

        await Promise.map(
          _.values(ioNamespace.connected),
          async (socket) => {
            const socketLogin = _.get(socket, 'user.login');
            if (socketLogin === login) {
              // do not notify the user that initiates mongo request
              return;
            }

            const userPermissions = socket.permissions;
            const inlineContext = { req: socket };

            const scopeConditionsMeta = await m.appLib.accessUtil.getScopeConditionsMeta(
              appModel,
              userPermissions,
              inlineContext,
              'view'
            );

            const scopeConditions = scopeConditionsMeta.overallConditions;
            const scopeFilter = getSiftFilteringFunc(scopeConditions);
            const isRecordAvailable = scopeFilter(record);

            if (!isRecordAvailable) {
              return;
            }

            const recordId = _.get(record, '_id');
            const collection = _.startCase(modelName);
            const message = recordId
              ? `Record in collection ${collection} with id ${recordId} has been ${recordChange}`
              : `Record in collection ${collection} has been ${recordChange}`;
            const msg = {
              type: 'database',
              level: 'info',
              message,
              data: {
                _id: recordId,
                change: `record${recordChange}`,
                collection: modelName,
                // record: await getTransformedRecord({
                //   appModel,
                //   userPermissions,
                //   inlineContext,
                //   actionsToPut: false,
                //   record,
                //   modelName,
                //   userContext: socket,
                // }),
              },
            };
            log.trace(`Emitting ${JSON.stringify(msg)} to socket ${socket.id}`);
            socket.emit('message', msg);
          },
          { concurrency: 50 }
        );
      },
    });
  }

  function getRecordChange(method, args) {
    if (method === 'insertOne') {
      return 'created';
    }
    if (method === 'replaceOne') {
      return 'updated';
    }
    if (method === 'findOneAndDelete') {
      return 'deleted';
    }
    if (method === 'findOneAndUpdate') {
      const $set = _.get(args[1], '$set', {});
      const isSoftDeleted = _.keys($set).length === 1 && $set.deletedAt;
      if (isSoftDeleted) {
        return 'deleted';
      }
      return 'updated';
    }
    if (method === 'updateOne') {
      return 'updated';
    }
    return null;
  }

  m.addHooks = () => {
    const modelNames = _.keys(m.appLib.appModel.models);

    _.each(modelNames, (modelName) => {
      m.appLib.db.collection(modelName).after('write', function ({ args, method, result, login }) {
        m.appLib.ws.sendRequest(mongoDbChangeEvent, { record: result.record, modelName, method, args, login });
      });
    });
  };

  return m;
};
