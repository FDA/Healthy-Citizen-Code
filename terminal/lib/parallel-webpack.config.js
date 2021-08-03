const _ = require('lodash');
const path = require('path');
const webpack = require('webpack');

const wPlugs = {
  TerserJSPlugin: require('terser-webpack-plugin'),
  ShellPlugin: require('webpack-shell-plugin-next'),
  CopyWebpackPlugin: require('copy-webpack-plugin'),
  MiniCssExtractPlugin: require('mini-css-extract-plugin'),
  OptimizeCSSAssetsPlugin: require('optimize-css-assets-webpack-plugin'),
  ProvidePlugin: webpack.ProvidePlugin,
  HtmlWebpackPlugin: require('html-webpack-plugin'),
  HtmlWebpackInlineSourcePlugin: require('html-webpack-inline-source-plugin'),
  DotEnv: require('dotenv-webpack'),
  DefinePlugin: webpack.DefinePlugin
};

const rootPath = path.resolve(__dirname);
const developerMode = process.argv.indexOf('--env.develop') >= 0;

const babelPresets = [
  [
    '@babel/preset-env',
    {
      'targets': {
        'chrome': '58',
        'ie': '11'
      }
    }
  ]
];

!developerMode && babelPresets.unshift(['minify', {builtIns: false}]);

const babelConfig = {
  'exclude': ['core-js', 'babel-polyfill'],
  'plugins': ['@babel/plugin-transform-classes'],
  'presets': babelPresets,
  minified: !developerMode,
  compact: !developerMode,
  retainLines: developerMode,
  comments: false
};

/* Common config used as base for each lib to be webpacked.
*   Specific config for each lib is below.
*
*  Please note 'pluginsConfig' which is created to make deep merge of configurations possible.
*   This is converted into common plugins:[ new PluginName(params),...]
*
* */
const rules = {
  babelJs: {
    test: /\.js$/,
    use: [{
      loader: 'babel-loader',
      options: babelConfig
    }]
  },
  css: {
    test: /\.css$/,
    use: [wPlugs.MiniCssExtractPlugin.loader, 'css-loader']
  },
  less: {
    test: /\.less$/,
    loader: [wPlugs.MiniCssExtractPlugin.loader, 'css-loader', 'less-loader']
  },
  assetsFile: {
    test: /\.(jpg|png|ttf|eot|svg|otf|woff|woff2)/,
    loader: 'file-loader?name=/assets/[contenthash:8].[ext]'
  }
};

const commonConfig = {
  cache: true,
  mode: developerMode ? 'development' : 'production',
  context: rootPath,
  entry: {},
  output: {
    filename: 'index.js',
    libraryTarget: 'assign',
    library: '[name]',
  },
  module: {
    rules: [
      rules.babelJs,
      rules.css,
      rules.less,
      rules.assetsFile,
    ],
  },
  pluginsConfig: {
    MiniCssExtractPlugin: {
      filename: 'css/style.css',
    },
    DotEnv: {},
  },
  optimization: {
    minimizer: developerMode ? [] : [new wPlugs.TerserJSPlugin({}), new wPlugs.OptimizeCSSAssetsPlugin({})],
    minimize: !developerMode
  }
};

/* Override 'commonWebpackConfig' (above) here with specific settings of each lib need to be webpacked */
const libraries = {
  'xterm': {
    entry: './src/xterm/xterm-bundle.js'
  },
};
const customMerger = (objValue, srcValue) => {
  if (_.isArray(objValue)) {
    return srcValue;
  }
};

const args = process.argv.slice(2);
let filter = args.length ? args.pop() : '';
filter = filter && filter.substr(0, 2) !== '--' ? filter : '';

const result = _.compact(_.map(libraries, (itemConfig, name) => {
  if (filter && !name.match(new RegExp(filter))) {
    return null;
  }

  const generatedConfig = {
    output: {
      path: `${rootPath}/../public/js/lib/${name}`,
      publicPath: `..`,
    },
  };

  const resultConfig = _.mergeWith(
    {},
    commonConfig,
    generatedConfig,
    itemConfig,
    customMerger
  );

  resultConfig.plugins = _.map(resultConfig.pluginsConfig,
    (params, plugName) => params ? new wPlugs[plugName](params) : new wPlugs[plugName]());
  delete resultConfig.pluginsConfig;

  return resultConfig;
}));

module.exports = result;
