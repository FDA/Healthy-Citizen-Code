const path = require('path');

const gulp = require('gulp');
const del = require('del');
const filter = require('gulp-filter');
const fs = require('fs');

const conf = require('../config');

gulp.task('clean:tmp', cleanTmp);
function cleanTmp() {
  return del([conf.paths.tmp]);
}

gulp.task('clean:dist', cleanDist);
function cleanDist() {
  return del([conf.paths.dist]);
}

gulp.task('mv:dist', mvBuild);
function mvBuild(done) {
  fs.rename(conf.paths.distTmp, conf.paths.dist, onEnd);
  function onEnd(err) {
    if (err) {
      throw err;
    }
    done();
  }
}

gulp.task('cp:fonts:serve', cpFonts.bind(this, conf.paths.tmp));
gulp.task('cp:fonts:dist', cpFonts.bind(this, conf.paths.distTmp));

function cpFonts(destPath) {
  var fontsPath = [
    path.join(conf.paths.assets, '/fonts/**'),
    path.join(conf.wiredep.directory, '/font-awesome/fonts/**')
  ];

  return gulp.src(fontsPath)
    .pipe(gulp.dest(path.join(destPath, 'assets/fonts')))
    .pipe(gulp.dest(path.join(destPath, 'assets/fonts')))
}

gulp.task('cp:assets:serve', cpAssets.bind(this, conf.paths.tmp));
gulp.task('cp:assets:dist', cpAssets.bind(this, conf.paths.distTmp));

function cpAssets(destPath) {
  return gulp.src([
    'assets/sound/**/*',
  ])
    .pipe(gulp.dest(path.join(destPath, 'assets/sound')))
}

gulp.task('cp:img:serve', cpImg.bind(this, conf.paths.tmp));
gulp.task('cp:img:dist', cpImg.bind(this, conf.paths.distTmp));
function cpImg(destPath) {
  return gulp.src([
    'assets/img/**/*',
  ])
    .pipe(gulp.dest(path.join(destPath, 'assets/img')))
}

gulp.task('cp:json:serve', cpJson.bind(this, conf.paths.tmp));
gulp.task('cp:json:dist', cpJson.bind(this, conf.paths.distTmp));
function cpJson(destPath) {
  return gulp.src([
    'api/**/*'
  ])
    .pipe(gulp.dest(path.join(destPath, '/api')))
}