const webpack = require('webpack');
const path = require('path');

module.exports = {
  devServer: {
    contentBase: path.resolve(__dirname, './public/js/client-modules'),
    port: 9000,
  },

  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('development'),
    }),
  ],
};
