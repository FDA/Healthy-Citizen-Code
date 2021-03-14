const path = require('path');
const _ = require('lodash');

const ROOT_PATH = path.resolve(__dirname);
const TMP_OUTPUT_PATH = ROOT_PATH  + '/out';
const TARGET_PATH = `./public/js/lib/force-graph`

const developerMode = process.argv.indexOf('--env.develop') >= 0;

const defaultConfig = {
  RESOURCE_PREFIX: '',
  DEVELOPMENT_MODE: developerMode,
};
const config = Object.assign( defaultConfig, require('dotenv').config({path: ROOT_PATH + '/.env'}).parsed);

const webpack = require('webpack');
const TerserJSPlugin = require('terser-webpack-plugin');
const ShellPlugin = require('webpack-shell-plugin-next');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');

const babelConfig = require('../common/babel.config.json');// looks strange but this was the only way to force babel to take all options

babelConfig.minified = !developerMode;
babelConfig.compact = !developerMode;
babelConfig.retainLines = developerMode;

module.exports = {
  cache: true,
  mode: developerMode ? 'development' : 'production',
  context: ROOT_PATH,
  entry: './force-graph.js',
  output: {
    path: TMP_OUTPUT_PATH,
    publicPath: `${config.RESOURCE_PREFIX || ''}/public/js/lib/force-graph/`,
    filename: 'index.js',
    libraryTarget: 'assign',
    library: '[name]',
  },
  resolve: {
    alias: {
      'common': ROOT_PATH + '/../common',
    }
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
        use: [MiniCssExtractPlugin.loader, 'css-loader']
      },
      {
        test: /\.less$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader', 'less-loader']
      },
      {
        test: /\.(jpg|png|ttf|eot|svg|otf|woff|woff2)/,
        use: [{
          loader: 'file-loader',
          options: {name: 'assets/[contenthash:8].[ext]'}
        }]
      },
    ],
  },
  optimization: {
    minimizer: developerMode ? [] : [new TerserJSPlugin({}), new OptimizeCSSAssetsPlugin({})],
    minimize: !developerMode
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'css/style.css',
    }),
    new webpack.DefinePlugin(_.mapValues(config, x => JSON.stringify(x))),
    new ShellPlugin({
      onBuildEnd: {scripts: [`cp -a ${TMP_OUTPUT_PATH}/. ${TARGET_PATH}`]}
    })
  ],
};
