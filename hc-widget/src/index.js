import registerHandlebarsHelpers from './lib/utils/hbs-helpers';
import { createWidget } from './modules/widgets';
import './css/styles.css';

registerHandlebarsHelpers();

import { resolveWidgetOptions } from './modules/widget-options/resolve-widget-options';
import { showErrorToUser } from './lib/utils/utils';
import { ConfigurationError } from './lib/exceptions';

(function tryToInitiateWidget() {
  try {
    initiateWidget();
  } catch (err) {
    showError(err);
  }
})();

function initiateWidget() {
  if (!inIframe()) {
    throw new ConfigurationError(ConfigurationError.NOT_IN_IFRAME);
  }

  resolveWidgetOptions()
    .then(createWidget)
    .catch(showError);
}

function inIframe() {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
}

function showError(err) {
  if (err instanceof ConfigurationError) {
    showErrorToUser(err.message);
  }
  console.error(err);
}
