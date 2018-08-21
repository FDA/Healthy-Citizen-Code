import registerHelpers from './lib/hbs-helpers';
registerHelpers();

import hcWidgetAPI from './modules/api';

import Questionnaire from './modules/widgets/questionnaire/questionnaire';
import DrugInteractions from './modules/widgets/drug-interactions/drug-interactions';
import AdverseEvents from './modules/widgets/adverse-events/adverse-events';
import AdverseEventsAlt from './modules/widgets/adverse-events/adverse-events-alt';
import Recalls from './modules/widgets/recalls/recalls';
import drugsVisualization from './modules/widgets/drugs-visualization/drugs-visualization';
import ndcLookup from './modules/widgets/ndc-lookup/ndc-lookup';

const widgetMap = {
  'questionnaire': Questionnaire,
  'drugInteraction': DrugInteractions,
  'adverseEvents': AdverseEvents,
  'adverseEventsAlt': AdverseEventsAlt,
  'recalls': Recalls,
  'drugsVisualization': drugsVisualization,
  'ndcLookup': ndcLookup
};

// todo: move to css
const widgetDefaults = {
  'type': 'questionnaire',
  'thankYouText': 'Thank you for participating in this survey.',
  'welcomeText': 'Hello! Click the button below to start the questionnaire.'
};

const hcWidget = function (node, options) {
  //  TODO: do widget id check, throw error for null
  hcWidgetAPI.getWidgetParams(options.hcWidgetId)
    .then(params => {
      const opts = Object.assign({}, widgetDefaults, params, options);
      const widget = widgetMap[opts.type];

      new widget(node, opts);
    })
    .catch(err => console.log(err));
};
window.hcWidget = hcWidget;

const widgets = document.querySelectorAll('[data-hc-widget-id]');

for (let i = 0; i < widgets.length; i++) {
  let node = widgets[i];
  new hcWidget(node, node.dataset);
}