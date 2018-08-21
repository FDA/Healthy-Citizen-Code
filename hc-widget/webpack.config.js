const path = require('path');
const distPath = path.resolve(__dirname, 'dist');

module.exports = {
  entry: ['babel-polyfill', 'whatwg-fetch', './src/index.js'],
  output: {
    filename: 'hc-widget.js',
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
            presets: [require.resolve('babel-preset-es2015-ie')]
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