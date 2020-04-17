const path = require('path');
const TerserJSPlugin = require('terser-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');

const babelConfig = require('./babel.config.json');// looks strange but this was the only way to force babel to take all options

const rootPath = path.resolve(__dirname);
const developerMode = process.argv.indexOf('--env.develop') >= 0;

babelConfig.minified = !developerMode;
babelConfig.compact = !developerMode;
babelConfig.retainLines = developerMode;

module.exports = {
  cache: true,
  mode: developerMode ? 'development' : 'production',
  context: rootPath,
  entry: './src/force-graph/force-graph.js',
  output: {
    path: rootPath + '/../public/js/lib/force-graph',
    publicPath: '/public/js/lib/force-graph',
    filename: 'index.js',
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
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader']
      },
      {
        test: /\.less$/,
        loader: [MiniCssExtractPlugin.loader, 'css-loader', 'less-loader']
      },
      {
        test: /\.(jpg|png|ttf|eot|svg|otf|woff|woff2)/,
        loader: 'file-loader?name=/assets/[contenthash:8].[ext]'
      },
    ],
  },
  optimization: {
    minimizer: developerMode ? [] : [new TerserJSPlugin({}), new OptimizeCSSAssetsPlugin({})],
    minimize: !developerMode
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'css/style.css',
    }),
    new CopyWebpackPlugin([
      {context: './src/force-graph', from: 'img/!*'},
    ]),
  ],
};
