import hcWidgetUtils from '../lib/utils';

export default function createIframe(opts) {
  var opts = opts || {};
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

  hcWidgetUtils.forEach(attributes, function (attr, key) {
    frame.setAttribute(key, attr);
  });

  hcWidgetUtils.forEach(style, function (ruleValue, ruleName) {
    frame.style[ruleName] = ruleValue;
  });

  frame.src = src || 'about:blank';

  return frame;
}

function guid() {
  return 'f' + (Math.random() * (1 << 30)).toString(16).replace('.', '');
}

function isNumberLike(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}