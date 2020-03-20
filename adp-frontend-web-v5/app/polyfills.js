
if (!Array.prototype.includes) {
  Array.prototype.includes = function(searchElement, fromIndex) {
    // return _.includes(this,searchElement, fromIndex);/*
    if (this == null) {
      throw new TypeError('"this" is null or not defined');
    }

    var o = Object(this);
    var len = o.length >>> 0;
    if (len === 0) {
      return false;
    }
    var n = fromIndex | 0;
    var k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);

    function sameValueZero(x, y) {
      return x === y || (typeof x === 'number' && typeof y === 'number' && isNaN(x) && isNaN(y));
    }


    while (k < len) {
      if (sameValueZero(o[k], searchElement)) {
        return true;
      }
      k++;
    }

    return false;
  }
}

if (!String.prototype.includes) {
  String.prototype.includes = function(search, start) {
    'use strict';
    if (typeof start !== 'number') {
      start = 0;
    }

    if (start + search.length > this.length) {
      return false;
    } else {
      return this.indexOf(search, start) !== -1;
    }
  };
  if (!Array.prototype.find) {
    Object.defineProperty(Array.prototype, 'find', {
      value: function (predicate) {

        if (this == null) {
          throw new TypeError('this is null or not defined');
        }

        var obj = Object(this);
        var len = obj.length >>> 0;

        if (typeof predicate !== 'function') {
          throw new TypeError('predicate must be a function');
        }

        var thisArg = arguments[1];

        var index = 0;

        while (index < len) {
          var iValue = obj[index];
          if (predicate.call(thisArg, iValue, index, obj)) {
            return iValue;
          }
          index++;
        }

        return undefined;
      }
    });
  }
}
