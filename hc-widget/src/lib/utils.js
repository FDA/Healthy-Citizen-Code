const hcWidgetUtils = {
  isArray, forEach, map, get,toCamelCase, find
};

export default hcWidgetUtils;

function isArray(arg) {
  return Object.prototype.toString.call(arg) === '[object Array]';
}

function forEach(object, cb) {
  if (isArray(object)) {
    object.forEach(cb);
  } else {
    for (let key in object) {
      if (object.hasOwnProperty(key)) {
        cb(object[key], key)
      }
    }
  }
}

function map(object, cb) {
  var newArray = [];

  if (isArray(object)) {
    newArray = object.map(cb);
  } else {
    for (let key in object) {
      if (object.hasOwnProperty(key)) {
        newArray.push(cb(object[key], key));
      }
    }
  }

  return newArray;
}

function get(object, path, defaultValue) {
  function getByPath(object, path) {
    var index = 0;
    var pathParts = path.split('.');
    var length = pathParts.length;

    while (object != null && index < length) {
      object = object[pathParts[index++]];
    }
    return (index && index == length) ? object : undefined;
  }

  if (typeof path !== 'string') {
    return undefined;
  }

  const result = object == null ? undefined : getByPath(object, path);
  return result === undefined ? defaultValue : result;
}

function toCamelCase(str) {
  return str.replace(/\s(.)/g, $1 => $1.toUpperCase())
    .replace(/\s/g, '')
    .replace(/^(.)/, $1 => $1.toLowerCase());
}

function find(array, cb) {
  for (let i = 0; i < array.length; i++) {
    if (cb(array[i], i)) {
      return array[i];
    }
  }

  return null;
}