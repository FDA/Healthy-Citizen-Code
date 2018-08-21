const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const defaultConfig = require('./webpack.config.js');

const config = {
  mode: 'production',
  performance: {
    hints: false
  },
  plugins: [
    new UglifyJsPlugin({
      uglifyOptions: {
        mangle: { reserved: ['hcWidget'] }
      }
    })
  ]
};

module.exports = Object.assign(defaultConfig, config);