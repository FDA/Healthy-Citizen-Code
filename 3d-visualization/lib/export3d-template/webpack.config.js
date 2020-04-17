const path = require('path');
const webpack = require('webpack');

const wbp = {
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

const developerMode = true;//process.argv.indexOf('--env.develop') >= 0;
const rootPath = path.resolve(__dirname);
const babelConfig = {
  'exclude': ['core-js', 'babel-polyfill'],
  'plugins': ['@babel/plugin-transform-classes'],
  'presets': [
    ['minify', {builtIns: false}],
    [
    '@babel/preset-env',
      {
        'targets': {
          'chrome': '58',
          'ie': '11'
        }
      }
    ]
  ],
  minified: !developerMode,
   compact: !developerMode,
   retainLines: developerMode,
   comments: developerMode
};

const config = {
  cache: true,
  mode: developerMode ? 'development' : 'production',
  context: rootPath,
  entry: {
    tmpl: './js/index.js'
  },
  output: {
    path: `${__dirname}/out`,
    filename: '[name].js',
    libraryTarget: 'assign',
    library: '[name]'
  },
  module: {
    rules: [
      // {
      //   test: /\.js$/,
      //   use: [{
      //     loader: 'babel-loader',
      //     options: babelConfig
      //   }]
      // },
      {
        test: /\.(service|logic|helpers)\.js$/,
        use: [{
          loader: path.resolve(`${__dirname}/adp-loader.js`)
        }]
      },
      {
        test: /\.css$/,
        use: [wbp.MiniCssExtractPlugin.loader, 'css-loader']
      },
      {
        test: /\.less$/,
        loader: [wbp.MiniCssExtractPlugin.loader, 'css-loader', 'less-loader']
      },
      {
        test: /\.(jpg|png|ttf|eot|svg|otf|woff|woff2)/,
        loader: 'base64-inline-loader?name=[name].[ext]'
      }
    ]
  },
  plugins: [
    new wbp.MiniCssExtractPlugin({
      filename: 'css/style.css'
    }),
    new wbp.HtmlWebpackPlugin({
      template: './index.html',
      inlineSource: developerMode ? '' : '.(js|css|png)$'
    }),
//    new wbp.HtmlWebpackInlineSourcePlugin(),
    new wbp.ProvidePlugin({
      $: 'jquery',
      _: 'lodash'
    }),
    new wbp.DefinePlugin({
      'DEVELOPMENT_MODE_TEST_DATA': JSON.stringify(developerMode)
    })
  ],
  optimization: {
    minimizer: developerMode ? [] : [new wbp.TerserJSPlugin({}), new wbp.OptimizeCSSAssetsPlugin({})],
    minimize: !developerMode
  }
};

module.exports = config;
