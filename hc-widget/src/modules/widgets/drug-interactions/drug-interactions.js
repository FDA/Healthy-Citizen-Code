import hcWidgetAPI from '../../api';
import $ from '../../../lib/dom';
import Table from '../../../modules/table/table';
import {widgetError} from '../../../lib/utils';

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
    this.$el = $(node);
    this.options = options;

    this.fetchData()
      .catch(err => {
        console.error(err);
        widgetError(err.message);
      });
  }

  fetchData() {
    return hcWidgetAPI.getDrugInteractions(this.options)
      .then(data => {
        if (data.count) {
          this.buildWidgetBody();
          this.buildTable(data);
        } else {
          throw new Error('Unable to get drugs interactions.')
        }
      });
  }

  buildWidgetBody() {
    this.widgetBody = $(drugInteractionsTemplate());
    this.$el.append(this.widgetBody);
  }

  buildTable(drugInteractions) {
    const data = fortmatInteractions(drugInteractions.list);
    const heads = Object.keys(data[0]);

    const table = new Table({
      heads, data,
      sortBy: 'Severity', order: 'desc', print: true
    });

    table.appendTo(this.widgetBody);
  }
}
