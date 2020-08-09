module.exports = function(config) {
  var gulpConfig = require('./gulp.config')();

  config.set({
    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: './',

    // frameworks to use
    // some available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['mocha', 'chai', 'sinon', 'chai-sinon'],

    // list of files / patterns to load in the browser
    files: gulpConfig.karma.files,

    // list of files to exclude
    exclude: gulpConfig.karma.exclude,

    proxies: {
      '/': 'http://localhost:8888/'
    },

    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: gulpConfig.karma.preprocessors,

    // test results reporter to use
    // possible values: 'dots', 'progress', 'coverage'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['progress', 'coverage'],

    coverageReporter: {
      dir: gulpConfig.karma.coverage.dir,
      reporters: gulpConfig.karma.coverage.reporters
    },

    // web server port
    port: 9876,

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR ||
    // config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,

    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    //        browsers: ['Chrome', 'ChromeCanary', 'FirefoxAurora', 'Safari', 'PhantomJS'],
    browsers: ['PhantomJS'],

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true
  });
};


// 'use strict';
//
// var path = require('path');
// var conf = require('./gulp/conf');
//
// var _ = require('lodash');
// var wiredep = require('wiredep');
//
// var pathSrcHtml = [
//   path.join(conf.paths.src, '/**/*.html')
// ];
//
// function listFiles() {
//   var wiredepOptions = _.extend({}, conf.wiredep, {
//     dependencies: true,
//     devDependencies: true
//   });
//
//   var patterns = wiredep(wiredepOptions).js
//       .concat([
//         path.join(conf.paths.src, '/app/**/*.module.js'),
//         path.join(conf.paths.src, '/app/**/*.js'),
//         path.join(conf.paths.src, '/**/*.spec.js'),
//         path.join(conf.paths.src, '/**/*.mock.js')
//       ])
//       .concat('node_modules/angular-mocks/angular-mocks.js')
//       .concat(pathSrcHtml);
//
//   var files = patterns.map(function(pattern) {
//     return {
//       pattern: pattern
//     };
//   });
//   files.push({
//     pattern: path.join(conf.paths.src, '/assets/**/*'),
//     included: false,
//     served: true,
//     watched: false
//   });
//   return files;
// }
//
// module.exports = function(config) {
//   var configuration = {
//     files: listFiles(),
//
//     singleRun: true,
//
//     autoWatch: false,
//
//     ngHtml2JsPreprocessor: {
//       stripPrefix: conf.paths.src + '/',
//       moduleName: 'generatorGulpAngular'
//     },
//
//     logLevel: 'WARN',
//
//     frameworks: ['jasmine', 'angular-filesort'],
//
//     angularFilesort: {
//       whitelist: [path.join(conf.paths.src, '/**/!(*.html|*.spec|*.mock).js')]
//     },
//
//     browsers : ['PhantomJS'],
//
//     plugins : [
//       'karma-phantomjs-launcher',
//       'karma-angular-filesort',
//       'karma-coverage',
//       'karma-jasmine',
//       'karma-ng-html2js-preprocessor'
//     ],
//
//     coverageReporter: {
//       type : 'html',
//       dir : 'coverage/'
//     },
//
//     reporters: ['progress'],
//
//     proxies: {
//       '/assets/': path.join('/base/', conf.paths.src, '/assets/')
//     }
//   };
//
//   // This is the default preprocessors configuration for a usage with Karma cli
//   // The coverage preprocessor is added in gulp/unit-test.js only for single tests
//   // It was not possible to do it there because karma doesn't let us now if we are
//   // running a single test or not
//   configuration.preprocessors = {};
//   pathSrcHtml.forEach(function(path) {
//     configuration.preprocessors[path] = ['ng-html2js'];
//   });
//
//   // This block is needed to execute Chrome on Travis
//   // If you ever plan to use Chrome and Travis, you can keep it
//   // If not, you can safely remove it
//   // https://github.com/karma-runner/karma/issues/1144#issuecomment-53633076
//   if(configuration.browsers[0] === 'Chrome' && process.env.TRAVIS) {
//     configuration.customLaunchers = {
//       'chrome-travis-ci': {
//         base: 'Chrome',
//         flags: ['--no-sandbox']
//       }
//     };
//     configuration.browsers = ['chrome-travis-ci'];
//   }
//
//   config.set(configuration);
// };