const path = require('path');
const gulp = require('gulp');
const uglify = require('gulp-uglify');
const pipeline = require('readable-stream').pipeline;
const concat = require('gulp-concat');

const conf = require('../config');

gulp.task('editorWorker', buildWorker);

function buildWorker() {
  const sourcePath = [
    'node_modules/filbert/filbert.js',
    'editors-workers/python-worker/*'
  ];
  const destPath = path.join(conf.paths.tmp, conf.paths.acePath);

  const uglifyConfig = {
    mangle: false,
    output: { max_line_len: Infinity },
  };

  return pipeline(
    gulp.src(sourcePath),
    uglify(uglifyConfig),
    concat('worker-python.js'),
    gulp.dest(destPath)
  );
}
