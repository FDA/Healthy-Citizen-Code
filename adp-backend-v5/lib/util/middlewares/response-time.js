const onHeaders = require('on-headers');

const startAtSymbol = Symbol.for('request.startAt');
const startAtDateSymbol = Symbol.for('request.startAtDate');

/**
 * Adds the `X-Response-Time` header displaying the response
 * duration in milliseconds.
 */
function responseTime(options) {
  let opts = options || {};
  if (typeof options === 'number') {
    opts = { digits: options };
  }

  const fn = typeof opts !== 'function' ? createSetHeader(opts) : opts;

  return (req, res, next) => {
    req[startAtSymbol] = process.hrtime();
    req[startAtDateSymbol] = new Date();

    onHeaders(res, () => {
      const diff = process.hrtime(req[startAtSymbol]);
      const time = diff[0] * 1e3 + diff[1] * 1e-6;

      fn(req, res, time);
    });

    next();
  };
}

function createSetHeader(options) {
  const digits = options.digits !== undefined ? options.digits : 3;
  const header = options.header || 'X-Response-Time';
  const suffix = options.suffix !== undefined ? Boolean(options.suffix) : true;

  return (req, res, time) => {
    if (res.getHeader(header)) {
      return;
    }

    let val = time.toFixed(digits);
    if (suffix) {
      val += 'ms';
    }

    res.setHeader(header, val);
  };
}

module.exports = {
  responseTime,
  startAtSymbol,
  startAtDateSymbol,
};
