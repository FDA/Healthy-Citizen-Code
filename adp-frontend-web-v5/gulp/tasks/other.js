const path = require('path');

const gulp = require('gulp');
const del = require('del');
const fs = require('fs-extra');

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

gulp.task('cp:fonts:serve', () => cpFonts(conf.paths.tmp));
gulp.task('cp:fonts:dist', () => cpFonts(conf.paths.distTmp));
gulp.task('cp:dxIcons:dist', () => cpDxFonts(conf.paths.distTmp));
gulp.task('cp:dxFonts:dist', () => cpDxIcons(conf.paths.distTmp));
gulp.task('cp:ckeditor:serve', () => cpCkEditorToTmp(conf.paths.tmp));
gulp.task('cp:aceEditor:serve', () => cpAceEditorToTmp(conf.paths.tmp));
gulp.task('cp:lib:dist', () => cpLibToDist(conf.paths.distTmp));

function cpFonts(destBasePath) {
  const fontsPath = [path.join(conf.paths.assets, '/fonts/**'), path.join(conf.moduleDir, '/font-awesome/fonts/**')];

  return gulp.src(fontsPath).pipe(gulp.dest(path.join(destBasePath, 'assets/fonts')));
}

function cpCkEditorToTmp(destBasePath) {
  const fontsPath = [path.join('smartadmin-plugin', '/ckeditor/**')];

  return gulp.src(fontsPath).pipe(gulp.dest(path.join(destBasePath, 'lib/ckeditor')));
}

function cpLibToDist(destBasePath) {
  const sourcePath = [path.join(conf.paths.tmp, 'lib/**/*')];

  return gulp.src(sourcePath).pipe(gulp.dest(path.join(destBasePath, 'lib')));
}

function cpAceEditorToTmp(destBasePath) {
  const fontsPath = [path.join(conf.moduleDir, '/ace-builds/**')];

  return gulp.src(fontsPath).pipe(gulp.dest(path.join(destBasePath, 'lib/ace-builds')));
}

function cpDxIcons(destBasePath) {
  const fonts = [path.join(conf.moduleDir, '/devextreme/dist/css/icons/**')];

  return gulp.src(fonts).pipe(gulp.dest(path.join(destBasePath, 'styles/icons')));
}

function cpDxFonts(destBasePath) {
  const fonts = [path.join(conf.moduleDir, '/devextreme/dist/css/fonts/**')];

  return gulp.src(fonts).pipe(gulp.dest(path.join(destBasePath, 'styles/fonts')));
}

gulp.task('cp:assets:serve', cpAssets.bind(this, conf.paths.tmp));
gulp.task('cp:assets:dist', cpAssets.bind(this, conf.paths.distTmp));

function cpAssets(destPath) {
  return gulp.src(['assets/sound/**/*']).pipe(gulp.dest(path.join(destPath, 'assets/sound')));
}

gulp.task('cp:img:serve', cpImg.bind(this, conf.paths.tmp));
gulp.task('cp:img:dist', cpImg.bind(this, conf.paths.distTmp));
function cpImg(destPath) {
  return gulp.src(['assets/img/**/*']).pipe(gulp.dest(path.join(destPath, 'assets/img')));
}

gulp.task('cp:json:serve', cpJson.bind(this, conf.paths.tmp));
gulp.task('cp:json:dist', cpJson.bind(this, conf.paths.distTmp));
function cpJson(destPath) {
  return gulp.src([path.join(conf.paths.tmp, 'manifest.json'), 'api/**/*']).pipe(
    gulp.dest((file) => {
      if (file.basename === 'manifest.json') {
        return destPath;
      }
      return path.join(destPath, '/api');
    })
  );
}

gulp.task('cp:workers:dist', cpWorkers);
function cpWorkers() {
  return gulp.src(['workers/**/*']).pipe(gulp.dest(path.join(conf.paths.distTmp, '/workers')));
}
