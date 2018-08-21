// based on restify.plugin.static
'use strict';

const fs = require('fs');
const path = require('path');
const escapeRE = require('escape-regexp-component');

const assert = require('assert-plus');
const mime = require('mime');
const async = require('async');


///--- Globals

//const MethodNotAllowedError = errors.MethodNotAllowedError;
//const NotAuthorizedError = errors.NotAuthorizedError;
//const ResourceNotFoundError = errors.ResourceNotFoundError;
const restifyErrors = require('restify-errors');


///--- Functions

/**
 * serves static files.
 * @public
 * @function serveStatic
 * @param    {Object} options an options object
 * @throws   {MethodNotAllowedError |
 *            NotAuthorizedError |
 *            ResourceNotFoundError}
 * @returns  {Function}
 */
function serveStatic(options) {
  let opts = options || {};

  if (typeof opts.appendRequestPath === 'undefined') {
    opts.appendRequestPath = true;
  }

  assert.object(opts, 'options');
  assert.optionalString(opts.directory, 'options.directory');
  assert.optionalArrayOfString(opts.directories, 'options.directories'); // either directory or directories need to be set
  assert.optionalNumber(opts.maxAge, 'options.maxAge');
  assert.optionalObject(opts.match, 'options.match');
  assert.optionalString(opts.charSet, 'options.charSet');
  assert.optionalString(opts.file, 'options.file');
  assert.bool(opts.appendRequestPath, 'options.appendRequestPath');

  function serveFileFromStats(file, err, stats, isGzip, req, res, next) {

    if (typeof req.connectionState === 'function' &&
      (req.connectionState() === 'close' ||
        req.connectionState() === 'aborted')) {
      next(false);
      return;
    }

    if (err) {
      next(new restifyErrors.ResourceNotFoundError(err, '%s', req.path()));
      return;
    } else if (!stats.isFile()) {
      next(new restifyErrors.ResourceNotFoundError('%s does not exist', req.path()));
      return;
    }

    if (res.handledGzip && isGzip) {
      res.handledGzip();
    }

    var fstream = fs.createReadStream(file + (isGzip ? '.gz' : ''));
    var maxAge = opts.maxAge === undefined ? 3600 : opts.maxAge;
    fstream.once('open', function (fd) {
      res.cache({maxAge: maxAge});
      res.set('Content-Length', stats.size);
      res.set('Content-Type', mime.getType(file));
      res.set('Last-Modified', stats.mtime);

      if (opts.charSet) {
        var type = res.getHeader('Content-Type') +
          '; charset=' + opts.charSet;
        res.setHeader('Content-Type', type);
      }

      if (opts.etag) {
        res.set('ETag', opts.etag(stats, opts));
      }
      res.writeHead(200);
      fstream.pipe(res);
      fstream.once('close', function () {
        next(false);
      });
    });

    res.once('close', function () {
      fstream.close();
    });
  }

  function serveNormal(file, req, res, next) {
    fs.stat(file, function (err, stats) {
      if (!err && stats.isDirectory() && opts.default) {
        // Serve an index.html page or similar
        var filePath = path.join(file, opts.default);
        fs.stat(filePath, function (dirErr, dirStats) {
          serveFileFromStats(filePath,
            dirErr,
            dirStats,
            false,
            req,
            res,
            next);
        });
      } else {
        serveFileFromStats(file,
          err,
          stats,
          false,
          req,
          res,
          next);
      }
    });
  }

  function serve(req, res, next) {
    var file;

    if (opts.file) {
      //serves a direct file
      file = path.join(opts.directory,
        decodeURIComponent(opts.file));
    } else {
      if (opts.appendRequestPath) {
        file = path.join(opts.directory,
          decodeURIComponent(req.path()));
      }
      else {
        var dirBasename = path.basename(opts.directory);
        var reqpathBasename = path.basename(req.path());

        if (path.extname(req.path()) === '' &&
          dirBasename === reqpathBasename) {

          file = opts.directory;
        }
        else {
          file = path.join(opts.directory,
            decodeURIComponent(path.basename(req.path())));
        }
      }
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next(new restifyErrors.MethodNotAllowedError(req.method));
      return;
    }

    let p = path.normalize(opts.directory).replace(/\\/g, '/');
    let re = new RegExp('^' + escapeRE(p) + '/?.*');
    if (!re.test(file.replace(/\\/g, '/'))) {
      next(new restifyErrors.NotAuthorizedError('%s', req.path()));
      return;
    }

    if (opts.match && !opts.match.test(file)) {
      next(new restifyErrors.NotAuthorizedError('%s', req.path()));
      return;
    }

    if (opts.gzip && req.acceptsEncoding('gzip')) {
      fs.stat(file + '.gz', function (err, stats) {
        if (!err) {
          res.setHeader('Content-Encoding', 'gzip');
          serveFileFromStats(file,
            err,
            stats,
            true,
            req,
            res,
            next);
        } else {
          serveNormal(file, req, res, next);
        }
      });
    } else {
      serveNormal(file, req, res, next);
    }

  }

  function serveFromMultipleDirectories(req, res, next) {
    if (opts.directories) {
      let fileFound = false;
      async.eachSeries(opts.directories, (directory, cb) => {
        if (!fileFound) {
          opts.directory = directory;
          serve(req, res, (err) => {
            if (!err) {
              fileFound = true;
            }
            cb();
          });
        } else {
          cb();
        }
      }, (err) => {
        if (!fileFound) {
          next(new restifyErrors.ResourceNotFoundError(`File '${req.path()}' was not found`));
        } else {
          next(err);
        }
      });
    } else if (opts.directory) {
      serve(req, res, next); // work as default
    } else {
      next(new restifyErrors.InternalServerError('Public Directory has not been specified'));
    }
  };

  return (serveFromMultipleDirectories);
}

module.exports = serveStatic;
