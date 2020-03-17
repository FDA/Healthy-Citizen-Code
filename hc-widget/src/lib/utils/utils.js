export function isArray(arg) {
  return typeofToString(arg) === '[object Array]';
}

export function isString(arg) {
  return typeofToString(arg) === '[object String]';
}

export function isNumber(arg) {
  return typeofToString(arg) === '[object Number]' && !Number.isNaN(arg);
}

export function typeofToString(arg) {
  return Object.prototype.toString.call(arg);
}

export function forEach(object, cb) {
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

export function map(object, cb) {
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

export function get(object, path, defaultValue) {
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

export function toCamelCase(str) {
  return str.replace(/\s(.)/g, $1 => $1.toUpperCase())
    .replace(/\s/g, '')
    .replace(/^(.)/, $1 => $1.toLowerCase());
}

export function find(array, cb) {
  for (let i = 0; i < array.length; i++) {
    if (cb(array[i], i)) {
      return array[i];
    }
  }

  return null;
}

export function updateIframeHeight() {
  let iframeName = window.name;
  let iframe = window.parent.document.querySelector(`iframe[name="${iframeName}"]`);
  iframe.style.height = document.body.offsetHeight + 'px';
}

export function showErrorToUser(message) {
  const div = document.createElement('div');
  div.innerText = message;
  document.body.innerHTML = div.outerHTML;
}

export function forEachInObject(obj, cb) {
  for (const [key, value] of Object.entries(obj)) {
    cb(value, key);
  }
}

export function mapValues(obj, cb) {
  var result = {};

  for (const [key, value] of Object.entries(obj)) {
    result[key] = cb(value, key);
  }

  return result;
}

export function pickFromObject(obj, cb) {
  let result = {};

  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    const doPick = cb(value, key);

    if (doPick) {
      result[key] = value;
    }
  });

  return result;
}

export function hasIn(propName, obj) {
  return Object.keys(obj).includes(propName);
}

export function pick(obj, ...keys) {
  const result = {};

  keys.forEach((key) => {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  });

  return result;
}
