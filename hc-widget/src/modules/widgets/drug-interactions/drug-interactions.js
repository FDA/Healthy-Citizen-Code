import Iframe from '../../iframe';
import hcWidgetAPI from '../../api';
import $ from '../../../lib/dom';
import Table from '../../../modules/table/table';

import drugInteractionsTemplate from './drug-interactions.hbs';

const getSeverity = data => {
  const map = {
    'high': 2,
    'low': 1,
    'N/A': 0,
  };

  return {
    view: data,
    value: map[data],
    type: 'Number'
  };
};

function createInteraction(data, formatFn, type) {
  return {
    type,
    value: data,
    view: formatFn ? formatFn(data) : data
  }
}


function fortmatInteractions(data) {
  return data.map(item => {
    return {
      'Interaction Drugs': createInteraction(item.interactionDrugs),
      'Severity': getSeverity(item.severity),
      'Description': createInteraction(item.description)
    };
  });
}

export default class DrugInteractions {
  constructor(node, options) {
    this.options = options;
    this.options.events = {
      onLoad: this.onIframeLoad.bind(this)
    };

    new Iframe(node, options);
  }

  onIframeLoad(iframe) {
    this.parent = iframe;

    this.fetchData()
      .catch(err => {
        console.error(err);
        this.parent.showMessage(err.message);
      });
  }

  fetchData() {
    return hcWidgetAPI.getDrugInteractions(this.options)
      .then(data => {
        if (data.count) {
          this.buildTable(data)
        } else {
          throw new Error('Unable to get drugs interactions.')
        }
      });
  }

  buildTable(drugInteractions) {
    const data = fortmatInteractions(drugInteractions.list);
    const heads = Object.keys(data[0]);

    const widgetBody = $(drugInteractionsTemplate());
    const table = new Table({ heads, data, sortBy: 'Severity', order: 'desc', print: true });
    // TODO: replace with root for current widget
    table.parent = this.parent;

    table.appendTo(widgetBody);
    this.parent.append(widgetBody);
  }
}
