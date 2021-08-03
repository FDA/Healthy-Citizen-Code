module.exports = {
  /**
   * Name of column used for adding meta info to csv from xls.
   * It's necessary due to fact xls has sheets that groups data and csv does not.
   * */
  META_INFO_COLUMN_NAME: '_metaInfo',
  /** xls sheet types which passing down into csv data */
  SHEET_TYPES: {
    SCHEMA: 'schema',
    ACTION: 'action',
    ETL_DATA_SEED: 'etlDataSeed',
    ETL_SPEC: 'etlSpec',
    IGNORED: 'ignored',
    EMPTY: 'empty',
  },
  /** char used for nesting fields into objects in model */
  NESTING_CHAR: '*',
};
