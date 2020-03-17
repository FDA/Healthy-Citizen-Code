const webpack = require('webpack');
const MemoryFs = require('memory-fs');
const fs = require('fs-extra');
const _ = require('lodash');
const path = require('path');
const appRoot = require('app-root-path').path;
const log = require('log4js').getLogger('lib/helper-util');

module.exports = async (appLib, helperDirPaths, buildAppModelCodeOnStart) => {
  const m = {};

  /** File which content is
   * 1) being gathered by frontendHelperKeyToFileName
   * 2) transformed with webpack and sent to frontend
   * */
  m.appModelCodeFile = path.resolve(appRoot, './model/public/js/app-model-code.js');

  /** Key - appModelHelpers key. Value - file name in /helpers/ directory */
  m.helperKeyToFileName = {
    Lists: 'lists.js',
    Validators: 'validators.js',
    Transformers: 'transformers.js',
    Synthesizers: 'synthesizers.js',
    FiltersWhere: 'filters_where.js',
    FiltersRenderers: 'filters_renderers.js',
    Preparations: 'preparations.js',
    Hooks: 'hooks.js',
    appModelProcessors: 'app_model_processors.js',

    Renderers: 'renderers.js',
    CustomActions: 'custom_actions.js',
    FormRenderers: 'form_renderers.js',
    LabelRenderers: 'label_renderers.js',
    HeaderRenderers: 'header_renderers.js',
    LookupLabelRenderers: 'lookup_label_renderers.js',
    DxSummaryCalculators: 'dx_summary.js',
    DxDataSources: 'dx_data_sources.js',
    DxCalculateFilterExpression: 'dx_calculate_filter_expression.js',
  };

  /** appModelHelpers keys sent to frontend */
  m.frontendHelpersKeys = [
    'Renderers',
    'CustomActions',
    'FormRenderers',
    'LabelRenderers',
    'HeaderRenderers',
    'LookupLabelRenderers',
    'DxSummaryCalculators',
    'DxDataSources',
    'DxCalculateFilterExpression',
  ];

  m.frontendHelperKeyToFileName = _.pick(m.helperKeyToFileName, m.frontendHelpersKeys);

  loadAppModelHelpers();

  if (buildAppModelCodeOnStart) {
    try {
      // Compute appModelCode only once
      m.appModelCode = await getAppModelCodeStr();
    } catch (e) {
      throw new Error(`Unable to build app model code. ${e.stack}`);
    }
  }

  m.getAppModelCode = async () => {
    if (!m.appModelCode) {
      m.appModelCode = await getAppModelCodeStr();
    }
    return m.appModelCode;
  };

  m.sendJavascript = (res, body) => {
    res.writeHead(200, { 'Content-Type': 'application/javascript' });
    res.write(body);
    res.end();
  };

  function getExistingHelperFullPaths(fileName) {
    return helperDirPaths
      .map(p => path.resolve(appRoot, `${p}/${fileName}`))
      .filter(fullPath => fs.existsSync(fullPath));
  }

  function loadAppModelHelpers() {
    appLib.appModelHelpers = {};
    appLib.appModelHelpers.ValidatorUtils = require('../model/helpers/validators-util')(appLib);

    _.each(m.helperKeyToFileName, (fileName, key) => {
      const existingHelperFullPaths = getExistingHelperFullPaths(fileName);
      log.trace(`Loading helper '${key}' from ${existingHelperFullPaths.join(', ')}`);
      appLib.appModelHelpers[key] = loadHelper(existingHelperFullPaths);
    });

    function loadHelper(existingHelperFullPaths, arg = appLib) {
      const modules = existingHelperFullPaths.map(p => require(p)(arg));
      return _.merge(...modules);
    }
  }

  function getWebpackConfig() {
    return {
      mode: 'production',
      entry: m.appModelCodeFile,
      output: {
        filename: 'appModelCode',
        libraryTarget: 'umd',
        globalObject: 'window',
      },
      externals: {
        adpRenderLib: 'adpRenderLib',
        _: '_',
      },
      performance: {
        hints: false,
      },
      module: {
        rules: [
          {
            test: /\.js$/,
            exclude: /node_modules/,
            use: {
              loader: 'babel-loader',
              options: getBabelConfig(),
            },
          },
        ],
      },
    };

    function getBabelConfig() {
      return {
        presets: [
          [
            '@babel/preset-env',
            {
              targets: { ie: '11' },
              useBuiltIns: 'entry',
              corejs: 3,
            },
          ],
        ],
        comments: false,
        plugins: ['@babel/transform-runtime'],
      };
    }
  }

  /**
   * Returns string representing all code for the application as a string
   * @returns {Promise}
   */
  function getAppModelCodeStr() {
    createAppModelCodeFile();
    const compiler = webpack(getWebpackConfig());
    compiler.outputFileSystem = new MemoryFs();

    return new Promise((resolve, reject) => {
      compiler.run((err, stats) => {
        if (err) {
          return reject(err);
        }

        if (stats.hasErrors() || stats.hasWarnings()) {
          return reject(
            new Error(
              stats.toString({
                errorDetails: true,
                warnings: true,
              })
            )
          );
        }

        const result = stats.compilation.assets.appModelCode.source();
        resolve(result);
      });
    });
  }

  function createAppModelCodeFile() {
    let result = `window.appModelHelpers = {};\n`;
    for (const [helperKey, fileName] of Object.entries(m.frontendHelperKeyToFileName)) {
      const helperPaths = getExistingHelperFullPaths(fileName);
      result += getHelperStr(helperKey, helperPaths);
      result += '\n';
    }
    fs.outputFileSync(m.appModelCodeFile, result);

    function getHelperStr(helperKey, helperPaths) {
      const helperArr = [];
      helperArr.push(`window.appModelHelpers['${helperKey}'] = {};`);
      if (helperPaths.length) {
        const requireHelperPathsStr = helperPaths.map(helperPath => `require('${helperPath}')()`).join(',');
        helperArr.push(`Object.assign(window.appModelHelpers['${helperKey}'], ${requireHelperPathsStr});`);
      }
      return helperArr.join('\n');
    }
  }

  return m;
};
