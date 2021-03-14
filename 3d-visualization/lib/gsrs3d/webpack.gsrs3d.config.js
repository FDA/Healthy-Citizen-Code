const path = require('path');
const _ = require('lodash');

const ROOT_PATH = path.resolve(__dirname);
const TMP_OUTPUT_PATH = ROOT_PATH + '/out';
const TARGET_PATH = `./public/js/lib/gsrs3d`

const developerMode = process.argv.indexOf('--env.develop') >= 0;

const defaultConfig = {
  APPLICATION_TITLE: '',
  JSON_DATA_FILE_PATH: './data/',
  STYLES_FILE: '',
  DEFAULT_STYLES_FILE: '',
  DEFAULT_CONFIG_FILE: '',
  ALLOW_PERFORMANCE_MONITOR: 'false',
  DEVELOPMENT_MODE: developerMode,
  GSRS_WEBSITE_BASE_URI: '',
  BUILD_LEGEND_DYNAMICALLY: 'false',
  MERGE_SIMILAR_LEGEND_ITEMS: 'false',
}
const config = Object.assign(defaultConfig, require('dotenv').config({path: ROOT_PATH + '/.env'}).parsed);

const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const ShellPlugin = require('webpack-shell-plugin-next');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const babelConfig = require('../common/babel.config.json'); // looks strange but this was the only way to force babel to take all options

babelConfig.minified = !developerMode;
babelConfig.compact = !developerMode;
babelConfig.retainLines = developerMode;

module.exports = {
  cache: true,
  mode: developerMode ? 'development' : 'production',
  context: ROOT_PATH,
  resolve: {
    alias: {
      'common': ROOT_PATH + '/../common',
    }
  },
  entry: {
    'adp-app': './index.js'
  },
  output: {
    path: TMP_OUTPUT_PATH,
    filename: 'app.js',
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
          loader: ROOT_PATH + '/../common/adp-loader/adp-loader.js'
        }]
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader']
      },
      {
        test: /\.less$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader', 'less-loader']
      },
      {
        test: /\.(jpg|png|ttf|eot|svg|otf|woff|woff2)/,
        use: {loader: 'file-loader', options: {name: 'assets/[contenthash:8].[ext]'}}
      },
    ]
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'styles.css',
    }),
    new HtmlWebpackPlugin({
      template: './index.html',
      templateParameters: (compilation, assets, assetTags) => ({
        compilation,
        webpackConfig: compilation.options,
        htmlWebpackPlugin: {
          tags: assetTags,
          files: assets,
          options: config,
        },
      })
    }),
    new webpack.ProvidePlugin({
      $: 'jquery',
      _: 'lodash',
      dayjs: 'dayjs'
    }),
    new webpack.DefinePlugin(_.mapValues(config, x => JSON.stringify(x))),
    new ShellPlugin({
      onBuildEnd: {scripts: [`cp -a ${TMP_OUTPUT_PATH}/. ${TARGET_PATH}`]}
    })
  ],
  optimization: {
    minimizer: developerMode ? [] : [new TerserPlugin({}), new OptimizeCSSAssetsPlugin({})],
    minimize: !developerMode
  }
};
