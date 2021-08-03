const csv = require('csv-parser');
const _ = require('lodash');
const fs = require('fs-extra');
const Promise = require('bluebird');
const JSON5 = require('json5');

const { SHEET_TYPES, META_INFO_COLUMN_NAME } = require('../consts');
const { schemaRow, etlSeedRow, specialActionRow, etlSpecRow } = require('./csv_row_handlers');

class CsvToModelTransformer {
  /**
   * @param options contains csvPath, outputModelPath and other custom options passed to rowHandlers
   */
  constructor(options) {
    this.state = {
      schema: {
        currentPath: '', // for example 'models.tasks.fields.name'
        nestedLvl: 0, // Examples: '* Log' = 1, '** Reminders Required' = 2
        model: {}, // aggregated model from all model tabs
        nestedState: {}, // state for storing last paths for certain level
      },
      // etl data should be parsed as simple model, but handled other way
      etl: {
        currentPath: '',
        nestedLvl: 0,
        model: {},
        nestedState: {},
        dataSeedPromiseFuncs: [], // funcs returning promise for data seed tabs like'!data.users'
      },
      actionPromisesFuncs: [], // funcs returning promise for action tabs like '!files'
      connectionManager: require('./connection_manager')(),
      headersMeta: {},
    };

    this.options = { ...options, skipSheets: options.skipSheets || [] };

    this.rowHandlers = {
      [SHEET_TYPES.ACTION]: specialActionRow,
      [SHEET_TYPES.ETL_DATA_SEED]: etlSeedRow,
      [SHEET_TYPES.ETL_SPEC]: etlSpecRow,
      [SHEET_TYPES.SCHEMA]: schemaRow,
    };
  }

  transform() {
    const { csvPath } = this.options;
    const {
      actionPromisesFuncs,
      etl: { dataSeedPromiseFuncs },
    } = this.state;

    return new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('headers', headers => {
          this._handleHeaders(headers);
        })
        .on('data', async csvRowData => {
          try {
            await this._handleRow(csvRowData);
          } catch (e) {
            reject(e);
          }
        })
        .on('end', async () => {
          // console.log(`Transformed ${csvPath} to model.`);
          try {
            if (actionPromisesFuncs.length) {
              console.log(`--- Started special actions ---`);
              await Promise.mapSeries(actionPromisesFuncs, func => func());
            }
            if (dataSeedPromiseFuncs.length) {
              console.log(`--- Started data seed actions ---`);
              await Promise.mapSeries(dataSeedPromiseFuncs, func => func());
            }
            resolve(this.state.schema.model);
          } catch (e) {
            console.log(`Error occurred on 'end' stage of transformation`);
            reject(e);
          }
        });
    });
  }

  static _isEmptyCsvRow(csvRowData) {
    return _.every(csvRowData, (val, key) => {
      if (key.startsWith('#')) {
        return true;
      }
      return !val;
    });
  }

  _handleHeaders(headers) {
    _.each(headers, header => {
      const meta = {};
      let colNameVal = header;
      meta.isMeta = header === META_INFO_COLUMN_NAME;

      if (colNameVal.startsWith('#')) {
        meta.isComment = true;
        colNameVal = colNameVal.slice(1);
      }

      const modifiers = {};
      if (!_.isUndefined(this.options.camelCaseColumns)) {
        modifiers.isCamelCase = !!this.options.camelCaseColumns
      }

      if (colNameVal.startsWith('{') && colNameVal.endsWith('}')) {
        modifiers.returnAsIs = true;
        colNameVal = colNameVal.slice(1, -1);
      }

      while (colNameVal && /^["`]/.test(colNameVal)) {
        if (
          (colNameVal.startsWith('"') && colNameVal.endsWith('"')) ||
          (colNameVal.startsWith('«') && colNameVal.endsWith('»'))
        ) {
          modifiers.isString = modifiers.isString || true;
          colNameVal = colNameVal.slice(1, -1);
        }
        if (colNameVal.startsWith('`') && colNameVal.endsWith('`')) {
          modifiers.isCamelCase = modifiers.isCamelCase || false;
          colNameVal = colNameVal.slice(1, -1);
        }
      }
      meta.isOther = colNameVal === 'Other';

      const defaultModifiers = { isString: false, isCamelCase: true };
      const finalModifiers = _.assign({}, defaultModifiers, modifiers);
      meta.modifiers = finalModifiers;

      meta.path = colNameVal;
      if (finalModifiers.isCamelCase) {
        meta.path = colNameVal
          .split('.')
          .map(_.camelCase)
          .join('.');
      }

      this.state.headersMeta[header] = meta;
    });
  }

  async _handleRow(csvRowData) {
    if (CsvToModelTransformer._isEmptyCsvRow(csvRowData)) {
      return;
    }

    const metaInfo = CsvToModelTransformer._getMetaInfo(csvRowData);
    const { sheetType } = metaInfo;
    if (this.options.skipSheets.includes(sheetType)) {
      return;
    }

    const handler = this.rowHandlers[sheetType];
    if (!handler) {
      console.log(`Unable to find handler, following row will be skipped:`, csvRowData);
      return;
    }
    return handler(csvRowData, metaInfo, this.state, this.options);
  }

  static _getMetaInfo(csvRowData) {
    const metaInfoVal = csvRowData[META_INFO_COLUMN_NAME];
    if (metaInfoVal) {
      try {
        return JSON5.parse(metaInfoVal);
      } catch (e) {
        return {};
      }
    }
    return {};
  }
}

module.exports = CsvToModelTransformer;
