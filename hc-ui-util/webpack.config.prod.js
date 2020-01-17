const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  devtool: 'source-map',

  optimization: {
    noEmitOnErrors: true,
    nodeEnv: 'production',
    minimizer: [
      new TerserPlugin({
        include: /\.min\.js$/,
        parallel: true,
        sourceMap: true,
      }),
    ],
  },

  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
    new webpack.optimize.ModuleConcatenationPlugin(),
    new webpack.NoEmitOnErrorsPlugin(),
  ],
};
