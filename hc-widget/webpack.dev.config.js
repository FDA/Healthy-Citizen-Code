const defaultConfig = require('./webpack.config.js');

const config = {
  mode: 'development',
  devtool: 'eval',
  devServer: {
    contentBase: defaultConfig.output.path,
    port: 9000
  }
};

module.exports = Object.assign(defaultConfig, config);