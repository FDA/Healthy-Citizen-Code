const path = require('path');
const distPath = path.resolve(__dirname, 'dist');

module.exports = {
  entry: {
    'hc-widget-loader': './src/script-loader/index.js',
    'hc-widget': './src/index.js'
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
          options: require('./babel.config'),
        }
      },
      {
        test: /\.hbs$/,
        loader: 'handlebars-loader',
        query: {
          partialDirs: [
            path.join(__dirname, 'src', 'modules', 'table')
          ],
          knownHelpers: ['for', 'dashcase']
        }
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: 'style-loader',
          },
          {
            loader: 'css-loader',
            options: {
              modules: 'global',
            },
          },
        ],
      }
    ]
  }
};
