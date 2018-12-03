const path = require('path');
const distPath = path.resolve(__dirname, 'dist');

module.exports = {
  entry: {
    'hc-widget-loader': './src/script-loader/index.js',
    'hc-widget': ['babel-polyfill', 'whatwg-fetch', './src/index.js']
  },
  output: {
    filename: '[name].js',
    path: distPath
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [require.resolve('babel-preset-es2015-ie')],
            "plugins": ["transform-object-rest-spread"]
          },
        }
      },
      {
        test: /\.hbs$/,
        loader: 'handlebars-loader',
        query: {
          partialDirs: [
            path.join(__dirname, 'src', 'modules', 'table')
          ],
          knownHelpers: ['for']
        }
      },
      {
        test: /\.css$/,
        use: [
          'to-string-loader',
          'css-loader'
        ]
      }
    ]
  }
};