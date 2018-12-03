import lodashReduce from "lodash.reduce";
import lodashMap from "lodash.map";

export function isArray(arg) {
  return Object.prototype.toString.call(arg) === '[object Array]';
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

export function setStylesFromParams(widgetConfig) {
  const rules = {
    'fontFace': v => `font-family: ${v}, Sans-Serif;`,
    'fontSize': v => {
      let fontSize = +v;
      let lineHeight = fontSize * 1.25;

      return `font-size: ${fontSize}px; line-height: ${lineHeight}px;`
    },
    'fontStyle': v => {
      const map = {
        'bold': 'font-weight: bold',
        'italic': 'font-style: italic',
        'underline': 'text-decoration: underline',
        'strikeout': 'text-decoration: line-through'
      };

      return lodashMap(v, rule => map[rule]).join(';');
    }
  };

  let styles = lodashReduce(rules, (result, ruleFn, key) => {
    let option = widgetConfig[key];
    result += option ? ruleFn(option) : '';
    return result;
  }, '');

  document.body.setAttribute('style', styles);
}

export function widgetError(message) {
  const div = document.createElement('div');
  div.innerText = message;
  document.body.innerHTML = div.outerHTML;
}