import registerHelpers from './lib/hbs-helpers';
registerHelpers();

import hcWidgetAPI from './modules/api';
import {setStylesFromParams, widgetError} from './lib/utils';

import Questionnaire from './modules/widgets/questionnaire/questionnaire';
import DrugInteractions from './modules/widgets/drug-interactions/drug-interactions';
import AdverseEvents from './modules/widgets/adverse-events/adverse-events';
import AdverseEventsAlt from './modules/widgets/adverse-events/adverse-events-alt';
import Recalls from './modules/widgets/recalls/recalls';
import drugsVisualization from './modules/widgets/drugs-visualization/drugs-visualization';
import ndcLookup from './modules/widgets/ndc-lookup/ndc-lookup';
import {graphViewWidget} from './modules/widgets/graph-view-widget/';
import {preferences} from './modules/widgets/preferences/';

const widgetMap = {
  'questionnaire': Questionnaire,
  'drugInteraction': DrugInteractions,
  'adverseEvents': AdverseEvents,
  'adverseEventsAlt': AdverseEventsAlt,
  'recalls': Recalls,
  'drugsVisualization': drugsVisualization,
  'ndcLookup': ndcLookup,
  'graphViewWidget': graphViewWidget,
  'preferences': preferences
};

const widgetDefaults = {
  'type': 'questionnaire',
  'thankYouText': 'Thank you for participating in this survey.',
  'welcomeText': 'Hello! Click the button below to start the questionnaire.'
};

const inIframe = () => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
};

// main init logic
(function () {
  if (!inIframe()) {
    console.error('Widget init interrupted. Reason: Trying to initialize widget outside of iframe.');
    return;
  }
  const WIDGET_BODY_ID = 'hc-widget-body';
  const widgetConfig = document.querySelector(`#${WIDGET_BODY_ID}`).dataset;

  hcWidgetAPI.getWidgetParams(widgetConfig.widgetId)
    .then(params => {
      const opts = Object.assign({}, widgetDefaults, params, widgetConfig);
      setStylesFromParams(opts);

      if (widgetMap[opts.type]) {
        new widgetMap[opts.type](document.body, opts);
      } else {
        throw new Error('Can\'t initialize: widget type is not specified.');
      }
    })
    .catch(err => {
      console.log(err);
      widgetError(err.message);
    });
})();