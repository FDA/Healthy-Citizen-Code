import $ from '../lib/dom';

import createIframe from '../lib/iframe';
import hcWidgetCss from '../css/styles.css';

import lodashMap from 'lodash.map';
import lodashReduce from 'lodash.reduce';

const IFRAME_NAME = 'hcWidgetIframe';

export default class Iframe {
  constructor(node, options) {
    this.widgetNode = $(node);
    this.options = options;

    this.createIframe();
  }

  static updateIframeHeight() {
    const iframes = document.querySelectorAll(`iframe[name=${IFRAME_NAME}]`);

    for (let i = 0; i < iframes.length; i++) {
      let iframe = iframes[i];
      const childNodes = iframe.contentWindow.document.body.childNodes;

      if (childNodes.length) {
        iframe.style.height = childNodes[0].clientHeight + 'px';
      }
    }
  }

  createIframe() {
    const iframeOptions = {
      style: {width: '100%'},
      name: IFRAME_NAME
    };

    this.$iframe = $(createIframe(iframeOptions));
    this.iframe = this.$iframe.get(0);

    this.iframe.addEventListener('load', this.onLoad.bind(this), true);
    this.widgetNode.replaceWith(this.iframe);
  }

  append(el) {
    this.$iframeDocument.append(el);
    Iframe.updateIframeHeight();
  }

  showMessage(message) {
    const messageEl = document.createElement('div');
    messageEl.innerHTML = message;

    this.clear();
    this.$iframeDocument.append(messageEl);
    Iframe.updateIframeHeight();
  }

  clear() {
    this.$iframeDocument.get(0).body.innerHTML = '';
  }

  setStyles() {
    const stylesNode = $(`<style>${hcWidgetCss}</style>`).get(0);
    const document = this.$iframeDocument.get(0);
    const head = document.head || document.getElementsByTagName('head')[0];
    document.body.setAttribute('style', this.customStyles());

    head.appendChild(stylesNode);
  }

  customStyles() {
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
    return lodashReduce(rules, (result, ruleFn, key) => {
      let option = this.options[key];
      result += option ? ruleFn(option) : '';
      return result;
    }, '');
  }

  onLoad() {
    this.$iframeDocument = $(this.iframe.contentWindow.document);
    this.setStyles();

    this.options.events.onLoad(this, this.options);
    this.iframe.removeEventListener('load', this.onLoad);
  }
}