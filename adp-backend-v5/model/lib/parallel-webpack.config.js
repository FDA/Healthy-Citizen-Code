const _ = require('lodash');
const path = require('path');
const webpack = require('webpack');

const wPlugs = {
  TerserJSPlugin: require('terser-webpack-plugin'),
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
  minified: developerMode,
   compact: !developerMode,
  retainLines: developerMode,
  comments: false
};

const export3dConfig = {
  cache: true,
  mode: developerMode ? 'development' : 'production',
  context: `${rootPath}/export3d-template`,
  entry: {
    tmpl: './js/index.js'
  },
  output: {
    path: `${rootPath}/export3d-template/out`,
    filename: '[name].js',
    libraryTarget: 'assign',
    library: '[name]'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: [{
          loader: 'babel-loader',
          options: babelConfig
        }]
      },
      {
        test: /\.(service|logic|helpers)\.js$/,
        use: [{
          loader: `${rootPath}/export3d-template/adp-loader.js`
        }]
      },
      {
        test: /\.css$/,
        use: [wPlugs.MiniCssExtractPlugin.loader, 'css-loader']
      },
      {
        test: /\.less$/,
        loader: [wPlugs.MiniCssExtractPlugin.loader, 'css-loader', 'less-loader']
      },
      {
        test: /\.(jpg|png|ttf|eot|svg|otf|woff|woff2)/,
        loader: 'base64-inline-loader?name=[name].[ext]'
      }
    ]
  },
  plugins: [
    new wPlugs.MiniCssExtractPlugin({
      filename: 'css/style.css'
    }),
    new wPlugs.HtmlWebpackPlugin({
      template: './index.html',
      inlineSource: '.(js|css|png)$'
    }),
    new wPlugs.HtmlWebpackInlineSourcePlugin(),
    new wPlugs.ProvidePlugin({
      $: 'jquery',
      _: 'lodash'
    }),
    new wPlugs.DefinePlugin({
      'DEVELOPMENT_MODE_TEST_DATA': JSON.stringify(developerMode)
    })
  ],
  optimization: {
    minimizer: developerMode ? [] : [new wPlugs.TerserJSPlugin({}), new wPlugs.OptimizeCSSAssetsPlugin({})],
    minimize: developerMode
  }
};

/* Common config used as base for each lib to be webpacked.
*   Specific config for each lib is below.
*
*  Please note 'pluginsConfig' which is created to make deep merge of configurations possible.
*   This is converted into common plugins:[ new PluginName(params),...]
*
* */

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
      {
        test: /\.js$/,
        use: [{
          loader: 'babel-loader',
          options: babelConfig
        }]
      },
      {
        test: /\.css$/,
        use: [wPlugs.MiniCssExtractPlugin.loader, 'css-loader'],
      },
      {
        test: /\.less$/,
        loader: [wPlugs.MiniCssExtractPlugin.loader, 'css-loader', 'less-loader'],
      },
      {
        test: /\.(jpg|png|ttf|eot|svg|otf|woff|woff2)/,
        loader: 'file-loader?name=/assets/[contenthash:8].[ext]',
      },
    ],
  },
  pluginsConfig: {
    MiniCssExtractPlugin: {
      filename: 'css/style.css',
    },
    DotEnv: {},
  },
  optimization: {
    minimizer: [new wPlugs.TerserJSPlugin({}), new wPlugs.OptimizeCSSAssetsPlugin({})],
  },
};

/* Override 'commonWebpackConfig' (above) here with specific settings of each lib need to be webpacked */
const libraries = {
  'dmn-js': {
    entry: './src/bpm/dmnjs.js',
  },
  'bpmn-js': {
    entry: './src/bpm/bpmnjs.js',
  },
  'force-graph': {
    entry: './src/force-graph/force-graph.js',
    pluginsConfig: {
      CopyWebpackPlugin: [
        {context: './src/force-graph', from: 'img/!*'},
      ],
    },
  },
  'web-vowl': {
    entry: {
      webvowl: './src/WebVOWL/src/webvowl/js/entry.js',
      'webvowl.app': './src/WebVOWL/src/app/js/entry.js',
    },
    output: {
      filename: 'js/[name].js',
    },
    pluginsConfig: {
      CopyWebpackPlugin: [
        {context: './src/WebVOWL/src/app', from: 'data/**/*'},
        {context: './src/WebVOWL/src', from: 'index.html'},
        {context: './src/WebVOWL/lib', from: 'd3.min.js', to: 'js/d3.js'},
      ],
      MiniCssExtractPlugin: {
        filename: 'css/[name].css',
      },
      ProvidePlugin: {
        d3: 'd3',
      },
    },
  },
};

const result = _.map(libraries, (itemConfig, name) => {
  const generatedConfig = {
    output: {
      path: `${rootPath}/../public/js/lib/${name}`,
      publicPath: `/public/js/lib/${name}`,
    },
  };

  const resultConfig = _.merge(
    {},
    commonConfig,
    generatedConfig,
    itemConfig,
  );

  resultConfig.plugins = _.map(resultConfig.pluginsConfig, (params, plugName) => new wPlugs[plugName](params));
  delete resultConfig.pluginsConfig;

  return resultConfig;
});

result.push(export3dConfig);

module.exports = result;
