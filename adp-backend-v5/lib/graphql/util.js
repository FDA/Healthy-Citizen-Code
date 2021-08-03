const { ValidationError, AccessError, LinkedRecordError } = require('../errors');
const { getMongoDuplicateErrorMessage, getMongoSortParallelArrayErrorMessage } = require('../util/util');

const reDate = /^(?:new )?Date\("?(.+)"?\)$/;
function dateReviver(key, value) {
  if (typeof value === 'string') {
    const exec = reDate.exec(value);
    if (exec) {
      return new Date(exec[1]);
    }
  }
  return value;
}

function handleGraphQlError({ e, message, log, appLib, modelName }) {
  log.error(e.stack);
  if (e instanceof ValidationError || e instanceof AccessError || e instanceof LinkedRecordError) {
    throw e;
  }

  const schema = appLib.appModel.models[modelName];
  const duplicateErrMsg = getMongoDuplicateErrorMessage(e, schema);
  const sortParallelArrayErrMsg = getMongoSortParallelArrayErrorMessage(e);
  const mongoError = duplicateErrMsg || sortParallelArrayErrMsg;
  if (mongoError) {
    log.info(mongoError);
    throw new Error(mongoError);
  }

  log.error(e.stack);
  throw new Error(message);
}

module.exports = {
  dateReviver,
  handleGraphQlError,
};
