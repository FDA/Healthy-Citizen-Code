import iframeDOM from './iframeDOM';
import setStyles from './style-loader';
import CONFIG from '../../../config';

const IFRAME_OPTIONS = {
  style: { width: '100%' }
};
const WIDGET_BODY_ID = 'hc-widget-body';

const appendScript = (iframe, options) => {
  const document = iframe.contentWindow.document;
  const script = document.createElement('script');
  script.id = WIDGET_BODY_ID;

  Object.keys(options).forEach(key => {
    script.dataset[key] = options[key];
  });

  script.src = `${CONFIG.widgetUrl}/hc-widget.js`;
  document.body.appendChild(script);
};

export default function iframeWidget(node, widgetConfig) {
  const iframe = iframeDOM(IFRAME_OPTIONS);

  iframe.addEventListener('load', () => {
    setStyles(iframe, widgetConfig);
    appendScript(iframe, widgetConfig);
  });

  const iframeParent = node.parentNode;
  iframeParent.replaceChild(iframe, node);
}