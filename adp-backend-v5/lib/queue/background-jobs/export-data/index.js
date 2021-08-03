const { createExportDataToDbQueue, runExportDataToDb, EXPORT_DATA_TO_DB_QUEUE_NAME } = require('./export-data-to-db');
const {
  createExportDataToFileQueue,
  runExportDataToFile,
  EXPORT_DATA_TO_FILE_QUEUE_NAME,
} = require('./export-data-to-file');

const exportsModelName = '_exports';

module.exports = {
  createExportDataToDbQueue,
  runExportDataToDb,
  EXPORT_DATA_TO_DB_QUEUE_NAME,
  createExportDataToFileQueue,
  runExportDataToFile,
  EXPORT_DATA_TO_FILE_QUEUE_NAME,
  exportsModelName,
};
