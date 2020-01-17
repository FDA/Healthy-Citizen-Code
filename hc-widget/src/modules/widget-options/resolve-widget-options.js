import CONFIG from '../../config';
import { ConfigurationError } from '../../lib/exceptions';
import { checkWidgetTypeSupported } from '../widgets';

/**
 * Resolve widget options by source.
 * Sources are defined by options.wm param:
 * - if true:
 *  REQUEST from widget manager(wm) OR USE params defined in data attributes
 * - else:
 *  USE params defined in data attributes
 *
 * Algorithm assumes wm source of options **as trusted -- valid**, however data-attributes
 * source requires to be validated.
 *
 * @return {Promise<{ wmOptions: {Object}, attributeOptions: {DOMStringMap} }>}
 */
export function resolveWidgetOptions() {
  const attributeOptions = getOptionsFromDataset();
  const wmMode = useWidgetManager(attributeOptions);
  let optionsPromise;

  if (wmMode) {
    optionsPromise = fetchOptionsFromWidgetManager(attributeOptions)
  } else {
    checkWidgetTypeSupported(attributeOptions);
    optionsPromise = Promise.resolve();
  }

  return optionsPromise
    .then((wmOptions = {}) => ({ ...wmOptions, ...attributeOptions }));
}

/**
 * @return {DOMStringMap}
 */
function getOptionsFromDataset() {
  const widgetBodyId = 'hc-widget-body';
  const widgetNode = document.querySelector(`#${widgetBodyId}`);

  return widgetNode.dataset;
}

function useWidgetManager(attributeOptions) {
  const { wm } = attributeOptions;

  if (['true', 'false'].includes(wm)) {
    return wm === 'true';
  } else {
    console.warn(`Wrong value in option "wm": expected "true" or "false, got "${wm}". Falling back to default "true".`);
    return true;
  }
}

function fetchOptionsFromWidgetManager(attributeOptions) {
  const { widgetId } = attributeOptions;
  if (!widgetId) {
    throw new ConfigurationError(ConfigurationError.widgetIdRequired);
  }
  const endpoint = `${CONFIG.WIDGET_API_URL}/widgets/${widgetId}`;

  return fetch(endpoint)
    .then(res => res.json())
    .then(json => {
      if (json.success) {
        return json.data;
      } else {
        throw new ConfigurationError(json.data || ConfigurationError.unableToFetch);
      }
    });
}
