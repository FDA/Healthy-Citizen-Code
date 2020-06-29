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

function handleGraphQlError(e, defaultMessage, log, appLib) {
  log.error(e.stack);
  if (e instanceof ValidationError || e instanceof AccessError || e instanceof LinkedRecordError) {
    throw e;
  }

  const duplicateErrMsg = getMongoDuplicateErrorMessage(e, appLib.appModel.models);
  const sortParallelArrayErrMsg = getMongoSortParallelArrayErrorMessage(e);
  const mongoError = duplicateErrMsg || sortParallelArrayErrMsg;
  if (mongoError) {
    log.info(mongoError);
    throw new Error(mongoError);
  }

  log.error(e.stack);
  throw new Error(defaultMessage);
}

module.exports = {
  dateReviver,
  handleGraphQlError,
};
