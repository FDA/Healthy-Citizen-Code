import registerHandlebarsHelpers from './lib/utils/hbs-helpers';
import { createWidget } from './modules/widgets';
import $ from './lib/utils/dom';
import './css/styles.css';

registerHandlebarsHelpers();

import { resolveWidgetOptions } from './modules/widget-options/resolve-widget-options';
import { showErrorToUser } from './lib/utils/utils';
import { ConfigurationError } from './lib/exceptions';

(function initiateWidgets() {
  const widgetEls = getWidgetElements();
  widgetEls.forEach(tryToInitiateWidget);
})();

function tryToInitiateWidget(el) {
  try {
    initiateWidget(el);
  } catch (err) {
    showError(el, err);
  }
}

function initiateWidget(el) {
  if (!el) {
    console.error(ConfigurationError.WIDGET_NOT_FOUND);
    return;
  }

  resolveWidgetOptions(el)
    .then(opts => createWidget(el, opts))
    .catch(err => showError(el, err));
}

function getWidgetElements() {
  const getNotIframeEls = () => {
    const el = document.querySelector('#hc-widget-body');
    return el ? [el] : Array.from(document.querySelectorAll('[hc-widget]'));
  }

  const widgetElements = inIframe() ?
    [document.querySelector('#hc-widget-body')] :
    getNotIframeEls();

  return widgetElements.map((node) => {
    const widgetBody = $('<div>').get(0);
    Object.assign(widgetBody.dataset, node.dataset);
    $(node).replaceWith(widgetBody);

    return widgetBody;
  });
}

function inIframe() {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
}

function showError(el, err) {
  if (err instanceof ConfigurationError) {
    showErrorToUser(el, err.message);
  }
  console.error(err);
}
