const TerserPlugin = require('terser-webpack-plugin');
const defaultConfig = require('./webpack.config.js');
const Dotenv = require('dotenv-webpack');
const path = require('path');

const config = {
  mode: 'production',
  performance: {
    hints: false
  },
  plugins: [
    new Dotenv({
      path: path.resolve(__dirname, './.env'),
      safe: true
    }),
    new TerserPlugin({
      terserOptions: {
        mangle: { reserved: ['hcWidget'] }
      }
    })
  ]
};

module.exports = Object.assign(defaultConfig, config);
