const defaultConfig = require('./webpack.config.js');
const Dotenv = require('dotenv-webpack');
const path = require('path');

const config = {
  mode: 'development',
  devtool: 'eval',
  plugins: [
    new Dotenv({
      path: path.resolve(__dirname, './.env'),
      safe: true
    })
  ],
  devServer: {
    contentBase: defaultConfig.output.path,
    port: 9000
  }
};

const merged = Object.assign(defaultConfig, config);
module.exports = merged;