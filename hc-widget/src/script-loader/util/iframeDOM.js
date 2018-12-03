export default function iframeDOM(opts) {
  var opts = Object.assign({}, opts) || {};
  var frame;
  var name = opts.name || guid();
  var style = opts.style || {border: 'none'};
  var src = opts.url;

  frame = document.createElement('iframe');
  frame.name = name;

  delete opts.style;
  delete opts.name;
  delete opts.url;
  delete opts.root;
  delete opts.onload;
  delete opts.onerror;

  var attributes = {
    frameBorder: 0,
    allowTransparency: true,
    allowFullscreen: true,
    scrolling: 'no'
  };

  if (attributes.width && isNumberLike(attributes.width)) {
    frame.width = attributes.width + 'px';
  }
  if (attributes.height && isNumberLike(attributes.height)) {
    frame.height = attributes.height + 'px';
  }

  delete attributes.height;
  delete attributes.width;

  Object.keys(attributes).forEach(key => {
    let attr = attributes[key];
    frame.setAttribute(key, attr);
  });

  Object.keys(style).forEach(function (ruleName) {
    let ruleValue = style[ruleName];
    frame.style[ruleName] = ruleValue;
  });

  frame.src = src || 'about:blank';

  return frame;
}

function isNumberLike(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

function guid() {
  return 'f' + (Math.random() * (1 << 30)).toString(16).replace('.', '');
}