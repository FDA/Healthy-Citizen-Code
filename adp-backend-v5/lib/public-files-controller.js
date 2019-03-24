const fs = require('fs');
const path = require('path');
const escapeRE = require('escape-regexp-component');

const assert = require('assert-plus');
const mime = require('mime');
const async = require('async');

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
  const opts = options || {};

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
    if (
      typeof req.connectionState === 'function' &&
      (req.connectionState() === 'close' || req.connectionState() === 'aborted')
    ) {
      return next(false);
    }

    if (err) {
      const errMsg = `ResourceNotFoundError '${req.path}'`;
      return next(new Error(errMsg));
    }
    if (!stats.isFile()) {
      const errMsg = `${req.path} does not exist`;
      return next(new Error(errMsg));
    }

    if (res.handledGzip && isGzip) {
      res.handledGzip();
    }

    const fstream = fs.createReadStream(file + (isGzip ? '.gz' : ''));
    const maxAge = opts.maxAge === undefined ? 3600 : opts.maxAge;
    fstream.once('open', () => {
      res.set('Cache-Control', `public, max-age=${maxAge}`);
      res.set('Content-Length', stats.size);
      res.set('Content-Type', mime.getType(file));
      res.set('Last-Modified', stats.mtime);

      if (opts.charSet) {
        const type = `${res.getHeader('Content-Type')}; charset=${opts.charSet}`;
        res.setHeader('Content-Type', type);
      }

      if (opts.etag) {
        res.set('ETag', opts.etag(stats, opts));
      }
      res.writeHead(200);
      fstream.pipe(res);
      fstream.once('close', () => {
        next(false);
      });
    });

    res.once('close', () => {
      fstream.close();
    });
  }

  function serveNormal(file, req, res, next) {
    fs.stat(file, (err, stats) => {
      if (!err && stats.isDirectory() && opts.default) {
        // Serve an index.html page or similar
        const filePath = path.join(file, opts.default);
        fs.stat(filePath, (dirErr, dirStats) => {
          serveFileFromStats(filePath, dirErr, dirStats, false, req, res, next);
        });
      } else {
        serveFileFromStats(file, err, stats, false, req, res, next);
      }
    });
  }

  function serve(req, res, next) {
    let file;

    if (opts.file) {
      // serves a direct file
      file = path.join(opts.directory, decodeURIComponent(opts.file));
    } else if (opts.appendRequestPath) {
      file = path.join(opts.directory, decodeURIComponent(req.path));
    } else {
      const dirBasename = path.basename(opts.directory);
      const reqpathBasename = path.basename(req.path);

      if (path.extname(req.path) === '' && dirBasename === reqpathBasename) {
        file = opts.directory;
      } else {
        file = path.join(opts.directory, decodeURIComponent(path.basename(req.path)));
      }
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const errMsg = `MethodNotAllowedError: ${req.method}`;
      res.status(405).send({ error: errMsg });
      return next(errMsg);
    }

    const p = path.normalize(opts.directory).replace(/\\/g, '/');
    /* eslint-disable security/detect-non-literal-regexp */
    const re = new RegExp(`^${escapeRE(p)}/?.*`);
    const errMsg = `NotAuthorizedError ${req.path}`;
    if (!re.test(file.replace(/\\/g, '/'))) {
      res.status(401).send({ error: errMsg });
      return next(errMsg);
    }

    if (opts.match && !opts.match.test(file)) {
      res.status(401).send({ error: errMsg });
      return next(errMsg);
    }

    if (opts.gzip && req.acceptsEncoding('gzip')) {
      fs.stat(`${file}.gz`, (err, stats) => {
        if (!err) {
          res.setHeader('Content-Encoding', 'gzip');
          serveFileFromStats(file, err, stats, true, req, res, next);
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
      async.eachSeries(
        opts.directories,
        (directory, cb) => {
          if (!fileFound) {
            opts.directory = directory;
            serve(req, res, err => {
              if (!err) {
                fileFound = true;
              }
              cb();
            });
          } else {
            cb();
          }
        },
        err => {
          if (!fileFound) {
            const errMsg = `File '${req.path}' was not found`;
            res.status(404).send({ error: errMsg });
            return next(errMsg);
          }
          next(err);
        }
      );
    } else if (opts.directory) {
      serve(req, res, next); // work as default
    } else {
      const errMsg = 'Public Directory has not been specified';
      res.status(500).send({ error: errMsg });
      next(errMsg);
    }
  }

  return serveFromMultipleDirectories;
}

module.exports = serveStatic;
