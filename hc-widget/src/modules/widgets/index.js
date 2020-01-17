import { validateOptionsBySchema } from '../widget-options/validate-options';
import { setStylesFromOptionsToBody } from './utils';
import globalWidgetsOptionsSchema from '../widget-options/global-widgets-parameters-schema';
import { ConfigurationError } from '../../lib/exceptions';

const WIDGETS_MAP = {
  'questionnaire': require('./questionnaire/questionnaire').default,
  'drugInteraction': require('./drug-interactions/drug-interactions').default,
  'adverseEvents': require('./adverse-events/adverse-events').default,
  'recalls': require('./recalls/recalls').default,
  'ucsfRecalls': require('./ucsf-recalls/ucsf-recalls').default,
  'drugsVisualization': require('./drugs-visualization/drugs-visualization').default,
  'ndcLookup': require('./ndc-lookup/ndc-lookup').default,
  'graphViewWidget': require('./graph-view-widget/graph-view-widget').default,
  'preferences': require('./preferences/preferences').default,
};

/**
 * @param {Object} options
 * @return {Object} Widget
 */
export function createWidget(options) {
  const { type } = options;
  const widgetSchema = getWidgetSchema(type);
  const validatedOptions = validateOptionsBySchema(options, widgetSchema);

  setStylesFromOptionsToBody(validatedOptions);

  return new WIDGETS_MAP[type](document.body, validatedOptions);
}

function getWidgetSchema(type) {
  const widgetLocalSchemas = {
    'questionnaire': require('./questionnaire/questionnaire-widget-options'),
    'ucsfRecalls': require('./ucsf-recalls/ucsf-widget-options'),
    'preferences': require('./preferences/preferences-widget-options'),
    'drugInteraction': require('./drug-interactions/drug-interaction-widget-options'),
    'recalls': require('./recalls/recalls-widget-options'),
    'adverseEvents': require('./adverse-events/adverse-events-widget-options'),
    'graphViewWidget': require('./graph-view-widget/graph-view-widget-widget-options'),
    'drugsVisualization': require('./drugs-visualization/drugs-visualization-widget-options'),
  };

  const localSchema = widgetLocalSchemas[type] || {};

  return { ...globalWidgetsOptionsSchema, ...localSchema };
}

export function checkWidgetTypeSupported(attributeOptions) {
  const { type } = attributeOptions;

  if (!type) {
    throw new ConfigurationError(ConfigurationError.typeRequired);
  }

  if (!wmLessModeIsSupported(type)) {
    throw new ConfigurationError(`WM-less mode is not supported for Widget of type "${type}". Supported Widgets: "${supportedWidgetsList().join(', ')}."`);
  }
}

function supportedWidgetsList() {
  return Object.keys(WIDGETS_MAP);
}

function wmLessModeIsSupported(type) {
  return supportedWidgetsList().includes(type);
}
