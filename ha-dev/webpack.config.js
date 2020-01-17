const webpack = require('webpack');
const Dotenv = require('dotenv-webpack');
const path = require('path');
const merge = require('webpack-merge');
const prodConfig = require('./webpack.config.prod');

const devConfig = require('./webpack.config.dev');
const babelConfig = require('./client-modules/babel.config');

const PATHS = {
  src: path.resolve(__dirname, './client-modules/src/index.js'),
  dist: path.resolve(__dirname, './public/js/client-modules'),
  eslintConfig: path.resolve(__dirname, './client-modules/.eslintrc.json'),
};

const commonConfig = {
  entry: {
    index: PATHS.src,
  },

  output: {
    path: PATHS.dist,
    filename: 'module.js',
    libraryTarget: 'umd',
    globalObject: 'this',
    library: 'clientModule',
  },

  externals: {
    angular: 'angular',
  },

  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        options: babelConfig,
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'eslint-loader',
        options: {
          configFile: PATHS.eslintConfig,
        },
      },
      {
        test: /\.html$/,
        use: 'html-loader',
      },
    ],
  },

  resolve: {
    symlinks: false,
  },

  plugins: [
    new webpack.ProvidePlugin({
      d3: 'd3',
    }),
    new Dotenv({
      path: path.resolve(__dirname, '.env'),
      safe: true,
      silent: false,
    }),
  ],
};

module.exports = function(env, argv) {
  if (argv.mode === 'production') {
    return merge([commonConfig, prodConfig]);
  }
  if (argv.mode === 'development') {
    return merge([commonConfig, devConfig]);
  }
  throw new Error('Mode is not specified.');
};
