const path = require('path');
const merge = require('webpack-merge');
const prodConfig = require('./webpack.config.prod');
const devConfig = require('./webpack.config.dev');

const PATHS = {
  src: path.resolve(__dirname, './src/index.js'),
  dist: path.resolve(__dirname, './dist'),
};

const commonConfig = {
  entry: {
    'hc-ui-util': PATHS.src,
    'hc-ui-util.min': PATHS.src,
  },
  output: {
    path: PATHS.dist,
    libraryTarget: 'umd',
    globalObject: 'this',
    filename: '[name].js',
    library: 'hcUiUtil',
  },

  externals: {
    Highcharts: 'Highcharts',
    d3: 'd3',
    angular: 'angular',
  },

  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: ['babel-loader', 'eslint-loader'],
      },
      {
        test: /\.html$/,
        use: 'html-loader',
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: 'style-loader',
          },
          {
            loader: 'css-loader',
            options: {
              modules: 'global',
              localIdentName: '[hash:base64:5]',
            },
          },
        ],
      },
    ],
  },
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
