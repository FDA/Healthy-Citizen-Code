const _ = require('lodash');
const escapeStrRe = require('escape-string-regexp');
const safeRegex = require('safe-regex');

const endOfRegExp = /\/([gimy]+)?$/;
const isRegExpString = (s) => s.charAt(0) === '/' && endOfRegExp.test(s);

function getSourceFlags(s) {
  s = s.trim();
  if (!s) {
    return;
  }

  if (isRegExpString(s)) {
    const match = endOfRegExp.exec(s);
    const flags = match[1];
    const { index } = match;
    // do not escape since input is complete regexp
    return { source: s.substring(1, index), flags };
  }
  return { source: escapeStrRe(s), flags: '' };
}

function getNegateRegExp(source, flags) {
  return new RegExp(`^((?!${source}).)*$`, flags);
}

function toRegExp(pattern, opts = {}) {
  let regExp;
  if (!_.isString(pattern)) {
    throw new Error(`Param 'pattern' must be a string`);
  }
  const sourceFlags = getSourceFlags(pattern);
  let { source, flags } = sourceFlags;

  if (opts.startsWith) {
    source = `^${source}`;
  }
  if (opts.endsWith) {
    source = `${source}$`;
  }
  if (opts.insensitive && !flags.includes('i')) {
    flags += 'i';
  }

  if (opts.negate) {
    regExp = getNegateRegExp(source, flags);
  } else {
    regExp = new RegExp(source, flags);
  }

  if (opts.safe) {
    const isSafeRegex = safeRegex(regExp.source);
    if (!isSafeRegex) {
      throw new Error(`Unsafe regex ${pattern}.`);
    }
  }
  return regExp;
}

module.exports = {
  toRegExp,
};
