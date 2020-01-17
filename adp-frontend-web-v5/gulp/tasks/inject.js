const path = require('path');
const gulp = require('gulp');
const gulpOrder = require('gulp-order');
const gulpInject = require('gulp-inject');
const mainBowerFiles = require('main-bower-files');
const gulpFilter = require('gulp-filter');

// todo: filter only
// todo: add css inject
// todo: move overides here
// todo: add files from package not found
gulpInject.transform.html.js = function (path) {
  return '<script type="application/javascript" src="'+path+'"></script>';
};

const conf = require('../config');

function scriptsStream() {
  return gulp.src([
    //  file is strictly hardcoded, because of specific SmartAdmin app structure
    path.join(conf.paths.tmp, 'api_config.js'),
    path.join(conf.paths.tmp, 'sw-manager.js'),
    path.join(conf.paths.tmp, conf.paths.serverModules),
    path.join(conf.paths.tmp, conf.paths.defaultServerModules),
    path.join(conf.paths.tmp, conf.paths.serverScripts),
    path.join(conf.paths.src, 'app-core.config.js'),
    path.join(conf.paths.src, 'adp-render.lib.js'),
    path.join(conf.paths.src, 'app.ls.js'),
    path.join(conf.paths.src, 'app.db.js'),
    path.join(conf.paths.src, 'main.js'),
    // moving module definition to the top
    path.join(conf.paths.src, '/**/*.module.js'),
    path.join(conf.paths.src, '/**/module.js'),
    path.join(conf.paths.src, '/**/*.provider.js'),
    path.join(conf.paths.tmp, 'templateCacheHtml.js'),
    path.join(conf.paths.src, '/**/!(service-worker).js')
  ], { read: false });
}

gulp.task('inject', inject);

function inject() {
  const injectOptions = {
    ignorePath: [conf.paths.tmp],
    addRootSlash: false,
  };

  const source = path.join(conf.paths.src, conf.paths.index);

  return gulp.src(source)
    .pipe(gulpInject(
      scriptsStream(), {
        starttag: '<!-- inject:js -->',
        endtag: '<!-- endinject -->',
        ...injectOptions
      }))
    .pipe(gulpInject(
      injectNpmJs(),
      {
        starttag: '<!-- bower:js -->',
        endtag: '<!-- endbower -->',
        ...injectOptions,
      },
      ))
    .pipe(gulpInject(
      injectNpmCSS(),
      {
        starttag: '<!-- bower:css -->',
        endtag: '<!-- endbower -->',
        ...injectOptions,
      },
    ))
    .pipe(gulp.dest(conf.paths.tmp));
}

function injectNpmJs() {
  return gulp.src(getMainBowerFiles(), {read: false})
    .pipe(gulpFilter([
      '**/*.js',
    ]))
    .pipe(gulpOrder([
      '**/jquery.js',
      '**/bootstrap.js',
      '**/angular.js',
      '**/highcharts.js',
      '**/wavesurfer*.js',
      '**/moment*.js',
      '**/jszip*.js',
      '**/exceljs*.js',
      '**/*.js'
    ]));
}

function injectNpmCSS() {
  return gulp.src(getMainBowerFiles(), {read: false})
    .pipe(gulpFilter([
      '**/*.css',
    ]))
}

function getMainBowerFiles() {
  return mainBowerFiles({
    paths: {
      bowerDirectory: 'node_modules',
      bowerJson: 'package.json'
    },
    overrides: {
      "angular-ui-router": {
        "main": "./release/angular-ui-router.js",
        "dependencies": {
          "@uirouter/core": "*"
        }
      },
      "@uirouter/core": {
        "main": "./_bundles/ui-router-core.js"
      },

      "angular-ui-bootstrap": {
        "main": "./dist/ui-bootstrap-tpls.js"
      },
      "bootstrap": {
        "main": "./dist/js/bootstrap.js"
      },
      "ngmap": {
        "main": "./build/scripts/ng-map.js",
      },
      "angularjs-bootstrap-datetimepicker": {
        "main": [
          "src/js/datetimepicker.js",
          "src/js/datetimepicker.templates.js",
          "src/css/datetimepicker.css",
        ],
        "dependencies": {
          "angular": "^1.x",
          "moment": "^2.x"
        }
      },
      "ng-tags-input": {
        "dependencies": {
          "jquery-ui": "^1.11.x",
        }
      },
      "jszip": {
        "main": [
          "./dist/jszip.js"
        ],
        "dependencies": {}
      },
      "exceljs": {
        "main": [
          "./dist/exceljs.js"
        ],
        "dependencies": {}
      },
      "devextreme": {
        "main": [
          "./dist/js/dx.all.js",
          "./dist/css/dx.common.css",
          "./dist/css/dx.material.blue.light.compact.css",
        ],
        "dependencies": {
          "jszip": "^3.0.0",
          "exceljs": "^3.4.0"
        }
      },
      "idb-keyval": {
        "main": "./dist/idb-keyval-iife-compat.min.js",
        "dependencies": {}
      },
      "jquery-ui-dist": {
        "main": "./jquery-ui.js"
      },
      "highcharts": {
        "main": [
          "highcharts.js",
          "highcharts-more.js",
          "modules/solid-gauge.src.js"
        ],
        "dependencies": {}
      },

      "videojs-record": {
        "main": [
          "./dist/videojs.record.js",
          "./dist/css/videojs.record.css",
          "./dist/plugins/videojs.record.lamejs.js",
          "./dist/plugins/videojs.record.libvorbis.js",
          "./dist/plugins/videojs.record.recorderjs.js"
        ],
        "dependencies": {
          "videojs": "*",
          "wavesurfer.js": "*",
          "videojs-wavesurfer": "*",
          "recordrtc": "*",
          "webrtc-adapter": "*"
        }
      },
      "video.js": {
        "main": ["./dist/video.js", "./dist/video-js.css"],
        "dependencies": {}
      },
      "wavesurfer.js": {
        "main": [
          "./dist/wavesurfer.js",
          "./dist/plugin/wavesurfer.microphone.min.js",
        ],
        "dependencies": {}
      },
      "videojs-wavesurfer": {
        "main": "./dist/videojs.wavesurfer.js"
      },
      "webrtc-adapter": {
        "main": "./out/adapter.js",
      },
      "ui-cropper": {
        "main": [
          "compile/unminified/ui-cropper.js",
          "compile/unminified/ui-cropper.css"
        ],
      },
      "jquery-migrate": {
        "main": "./dist/jquery-migrate.min.js",
      }
    }
  });
}
