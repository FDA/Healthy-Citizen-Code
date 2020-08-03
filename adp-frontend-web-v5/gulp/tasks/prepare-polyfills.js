const gulp = require("gulp");
const conf = require("../config");
const bufferToVinyl = require("buffer-to-vinyl");
const polyfillLibrary = require("polyfill-library");

gulp.task("prepare:polyfills", function () {
  return polyfillLibrary.getPolyfillString({
    minify: true,
    features: {
      "es2015": {},
      "es2016": {},
      "es2017": {},
      "es2018": {},
      "document.currentScript": {}
    }
  }).then(function (bundleString) {
    return new Promise(function (resolve, reject) {
      bufferToVinyl.stream(new Buffer(bundleString), conf.paths.polyfillsScripts)
                   .pipe(gulp.dest(conf.paths.tmp))
                   .on("end", resolve)
                   .on("error", reject);
    })
  });
});








