const webpack = require('webpack');

module.exports = {
  resolve: {
    symlinks: false,
  },

  optimization: {
    noEmitOnErrors: true,
    nodeEnv: 'production',
    minimize: false,
  },

  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
    new webpack.optimize.ModuleConcatenationPlugin(),
    new webpack.NoEmitOnErrorsPlugin(),
  ],
};
