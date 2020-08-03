const path = require('path');
const gulp = require('gulp');
const uglify = require('gulp-uglify');
const pipeline = require('readable-stream').pipeline;
const concat = require('gulp-concat');

const conf = require('../config');

const workers = {
  python: {
    parserPath: 'node_modules/filbert/filbert.js',
    workerPath: 'editors-workers/python-worker/*',
    destName: 'worker-python.js',
  },
  relaxedJson: {
    parserPath: 'node_modules/json5/dist/index.js',
    workerPath: 'editors-workers/json5-worker/*',
    destName: 'worker-json5.js',
  },
}

gulp.task('pythonEditorWorker', () => buildWorker(workers.python));
gulp.task('relaxedJsonEditorWorker', () => buildWorker(workers.relaxedJson));

function buildWorker({ parserPath, workerPath, destName }) {
  const sourcePath = [
    parserPath,
    'editors-workers/ace-lib.js',
    workerPath,
  ];
  const destPath = path.join(conf.paths.tmp, conf.paths.acePath);

  const uglifyConfig = {
    mangle: false,
    output: { max_line_len: Infinity },
  };

  return pipeline(
    gulp.src(sourcePath),
    uglify(uglifyConfig),
    concat(destName),
    gulp.dest(destPath),
  );
}
