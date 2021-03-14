;(function() {
  'use strict';

  angular
    .module('app.adpCommon')
    .service('AdpAttrs', function () {
      return setAttributes;
    });

  function setAttributes(targetEl, args) {
    var action = args.action;

    var attrs = _.get(args, 'fieldSchema.html.' + action, {});
    _.each(attrs, function (val, name) {
      if (['class', 'style'].includes(name)) {
        appendAttr(name, val, targetEl);
      } else if (name in targetEl) {
        targetEl[name] = getProperty(val, args);
      } else {
        targetEl.setAttribute(name, val);
      }
    });
  }

  function appendAttr(name, val, targetEl) {
    var attrVal = targetEl.getAttribute(name);
    var delimiter = ({
      class: ' ',
      style: ';',
    })[name];

    var newAttrVal = _.compact([attrVal, val]).join(delimiter);
    targetEl.setAttribute(name, newAttrVal);
  }

  function getProperty(value, args) {
    if (value.type && value.type === 'function') {
      return _.partial(eventCb, value.code, args);
    }

    return value;
  }

  function eventCb(cbCodeString, args, e) {
    try {
      new Function('return ' + cbCodeString).call(args, e);
    } catch (e) {
      console.error('Error trying to call callback for ' + args.action + ' with args: ', args)
    }
  }
})();
