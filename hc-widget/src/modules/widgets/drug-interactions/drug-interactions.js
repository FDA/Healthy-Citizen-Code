import { fetchDrugInteractions } from './api';
import $ from '../../../lib/utils/dom';
import Table from '../../../modules/table/table';
import { showErrorToUser } from '../../../lib/utils/utils';

import drugInteractionsTemplate from './drug-interactions.hbs';
import { ResponseError } from '../../../lib/exceptions'

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

function formatInteractions(data) {
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
      .catch((err) => {
        console.error(err);
        showErrorToUser(node, ResponseError.DRUG_INTERACTIONS_EMPTY);
      });
  }

  fetchData() {
    return fetchDrugInteractions(this.options)
      .then(data => {
        if (data.count) {
          this.buildWidgetBody();
          this.buildTable(data);
        } else {
          throw new ResponseError(ResponseError.DRUG_INTERACTIONS_EMPTY);
        }
      });
  }

  buildWidgetBody() {
    this.widgetBody = $(drugInteractionsTemplate());
    this.$el.append(this.widgetBody);
  }

  buildTable(drugInteractions) {
    const data = formatInteractions(drugInteractions.list);
    const heads = Object.keys(data[0]);

    const table = new Table({
      heads, data,
      sortBy: 'Severity',
      order: 'desc',
      accordion: true,
      hideCols: 1,
      print: true,
    });

    table.appendTo(this.widgetBody);
  }
}
