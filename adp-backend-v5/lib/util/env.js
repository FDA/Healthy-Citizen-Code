const nodePath = require('path');

const appRoot = nodePath.resolve(__dirname, '../../');

function setAbsoluteEnvPath(key, root) {
  if (process.env[key]) {
    process.env[key] = getAbsolutePath(root, process.env[key]);
  }
}
function getAbsolutePath(root, p) {
  return p ? nodePath.resolve(root, p) : undefined;
}

function getAbsolutePathsFromCommaSeparated(root, paths) {
  return paths
    .split(',')
    .map((p) => getAbsolutePath(root, p))
    .filter((p) => p)
    .join(',');
}

function prepareEnv(root = appRoot) {
  // Absolute paths are not error prone. Its being used in custom prototypes and tests
  setAbsoluteEnvPath('LOG4JS_CONFIG', root);
  // process.env stores strings only
  process.env.APP_SCHEMA = process.env.APP_MODEL_DIR
    ? getAbsolutePath(appRoot, process.env.APP_MODEL_DIR)
    : getAbsolutePathsFromCommaSeparated(appRoot, process.env.APP_SCHEMA);

  process.env.CREATE_INDEXES = process.env.CREATE_INDEXES || 'true';
  process.env.APP_PORT = process.env.APP_PORT || 8000;
  process.env.ES_MAX_RETRIES = process.env.ES_MAX_RETRIES || 4;
}

function getSchemaPaths() {
  return process.env.APP_SCHEMA.split(',').filter((p) => p);
}

function getSchemaNestedPaths(nestedPath) {
  return getSchemaPaths().map((p) => `${p}/${nestedPath}`);
}

module.exports = {
  getAbsolutePath,
  prepareEnv,
  getSchemaNestedPaths,
  getSchemaPaths,
  getAbsolutePathsFromCommaSeparated,
  appRoot,
};
