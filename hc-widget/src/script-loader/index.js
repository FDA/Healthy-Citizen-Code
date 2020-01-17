import iframeWidget from './util/iframeWidget';
import { ConfigurationError } from '../lib/exceptions';

window['hcWidget'] = iframeWidget;

(function initWidgetFromDOM() {
  const widgetElements = document.querySelectorAll('[hc-widget]');

  if (!widgetElements.length) {
    console.warn(ConfigurationError.WIDGET_NOT_FOUND);
  }

  for (let i = 0; i < widgetElements.length; i++) {
    let node = widgetElements[i];
    iframeWidget(node, node.dataset);
  }
})();
