const path = require('path');
const { appRoot } = require('../../config/util');

module.exports = {
  filesCollectionName: '_files',
  uploadDir: path.resolve(appRoot, '../uploads'),
};
