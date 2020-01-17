const htmlTagRex = /<\/?[\w\s="/.':;#-\/\?]+>/gi;

export default function $(selector, context) {
  return new $.fn.init(selector, context);
};

$.isHTML = function (string) {
  return (string[0] === '<' && string[string.length - 1] === '>') ||
    htmlTagRex.test(string);
};

$.isRoot = function (node) {
  return !!node.body;
};

/**
 * Replace selected collection of DOM nodes with newContent
 * @param selector - instance of $ or HTMLElement
 * @param context - search context, element to search in
 * @return {*}
 */
// TODO: rename to $
// drops if context of instance of $
function init(selector, context) {
  var isString = typeof selector === "string";
  var nodes;

  if (!selector) {
    return this;
  }

  if (isString) {
    if ($.isHTML(selector)) {
      nodes = this.htmlToNode(selector).nodes;
    } else {
      nodes = (context || document).querySelectorAll(selector);
    }
  } else {
    nodes = [selector];
  }

  // TODO: resolve later, should be equal this and this.nodes
  this.nodes = nodes;
}

$.fn = $.prototype = {
  constructor: $,

  init: init,

  get: function (index) {
    return this.nodes[index];
  },

  forEach: function (cb, context) {
    var context = context || this;

    for (var i = 0; i < this.nodes.length; i++) {
      cb.call(context, this.nodes[i], i);
    }

    return this;
  },

  /**
   * Replace selected collection of DOM nodes with newContent
   * @param newContent - instance of $ or HTMLElement
   * @return {*}
   */
  replaceWith: function (newContent) {
    var newContent = newContent.nodes ? newContent.nodes[0] : newContent;

    return this.forEach(function (nodeItem) {
      var parent = nodeItem.parentNode;
      parent.replaceChild(newContent, nodeItem);
    });
  },

  htmlToNode: function (htmlString) {
    var newNode;
    var template = document.createElement('div');
    template.innerHTML = htmlString;
    newNode = template.firstChild;

    return new this.constructor(newNode);
  },

  append: function (newContent) {
    var newContent = newContent.nodes ? newContent.nodes[0] : newContent;

    return this.forEach(function (nodeItem) {
      if ($.isRoot(nodeItem)) {
        nodeItem.body.appendChild(newContent);
      } else {
        nodeItem.appendChild(newContent);
      }
    });
  },

  matches: function (selector) {
    const el = this.get(0);
    const ElementProto = Element.prototype;
    const polyfilled = (selector) => {
      return [].indexOf.call(document.querySelectorAll(selector), this) !== -1;
    };

    const fn = ElementProto.matches = ElementProto.msMatchesSelector || ElementProto.mozMatchesSelector ||
      ElementProto.webkitMatchesSelector || polyfilled;

    return fn.call(el, selector);
  },

  closest: function(selector) {
    let el = this.get(0);
    const ElementProto = Element.prototype;

    const fn = ElementProto.closest || function closest(selector) {
      let element = this;
      while (element && element.nodeType === 1) {
        if ($(element).matches(selector)) {
          return element;
        }

        element = element.parentNode;
      }

      return null;
    };

    return $(fn.call(el, selector));
  },

  remove: function () {
    this.forEach(function (node) {
      node.parentNode.removeChild(node);
    });
  },

  on: function (eventName, cb) {
    return this.forEach(function (node) {
      node.addEventListener(eventName, cb);
    });
  },

  off: function (eventName, cb) {
    return this.forEach(function (node) {
      node.removeEventListener(eventName, cb);
    });
  }
};

init.prototype = $.fn;