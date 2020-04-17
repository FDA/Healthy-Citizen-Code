const path = require('path');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const ShellPlugin = require('webpack-shell-plugin-next');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlWebpackInlineSourcePlugin = require('html-webpack-inline-source-plugin');

const babelConfig = require('./babel.config.json'); // looks strange but this was the only way to force babel to take all options

const rootPath = path.resolve(__dirname);
const developerMode = process.argv.indexOf('--env.develop') >= 0;

babelConfig.minified = !developerMode;
babelConfig.compact = !developerMode;
babelConfig.retainLines = developerMode;

module.exports = {
  cache: true,
  mode: developerMode ? 'development' : 'production',
  context: rootPath + '/export3d-template',
  entry: {
    tmpl: './js/index.js'
  },
  output: {
    path: rootPath + '/export3d-template/out',
    filename: '[name].js',
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
        test: /\.(service|logic|helpers)\.js$/,
        use: [{
          loader: rootPath + '/export3d-template/adp-loader.js'
        }]
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader']
      },
      {
        test: /\.less$/,
        loader: [MiniCssExtractPlugin.loader, 'css-loader', 'less-loader']
      },
      {
        test: /\.(jpg|png|ttf|eot|svg|otf|woff|woff2)/,
        loader: 'base64-inline-loader?name=[name].[ext]'
      },
    ]
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'css/style.css',
    }),
    new HtmlWebpackPlugin({
      template: './index.html',
      inlineSource: '.(js|css|png)$'
    }),
    new HtmlWebpackInlineSourcePlugin(),
    new webpack.ProvidePlugin({
      $: 'jquery',
      _: 'lodash',
      moment: 'moment'
    }),
    new webpack.DefinePlugin({
      'DEVELOPMENT_MODE_TEST_DATA': JSON.stringify(developerMode)
    }),
    new ShellPlugin({
      onBuildEnd: {scripts: ['cp lib/export3d-template/out/index.html public/js/lib/force-graph/export-template.html']}
    })
  ],
  optimization: {
    minimizer: developerMode ? [] : [new TerserPlugin({}), new OptimizeCSSAssetsPlugin({})],
    minimize: !developerMode
  }
};
