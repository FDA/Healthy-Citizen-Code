import hcWidgetAPI from '../../api';
import $ from '../../../lib/dom';
import {widgetError} from '../../../lib/utils';

import Table from '../../../modules/table/table';
import adverseEventsTemplate from './adverse-events.hbs';
import { formatEvents } from './adverse-events.helpers'

export default class AdverseEvents {
  constructor(node, options) {
    this.$el = $(node);
    this.options = options;

    this.$loader = $('<div class="loader-wrap"><div class="loader"></div></div>');
    this.$el.append(this.$loader);

    this.fetchData()
      .catch(err => {
        console.error(err);
        widgetError(err.message);
      });
  }

  fetchData() {
    this.options.patientData = {
      age: this.options.age,
      gender: this.options.gender
    };

    return hcWidgetAPI.getAdverseEventsAlt(this.options)
      .then(data => {
        if (data.length) {
          this.$loader.remove();
          this.buildWidgetBody();
          this.buildTable(data);
        } else {
          throw new Error('Unable to get adverse events.');
        }
      });
  }

  heads(data) {
    for (let i = 0; i < data.length; i++) {
      if (data[i].list.length) {
        return Object.keys(data[i].list[0])
      }
    }
  }

  buildWidgetBody() {
    this.widgetBody = $(adverseEventsTemplate());
    this.$el.append(this.widgetBody);
  }

  buildTable(medications) {
    const data = formatEvents(medications);
    const heads = this.heads(data);

    const table = new Table({
      heads, data,
      groupTitle: 'Total number of adverse events:',
      hasGrouping: true,
      accordion: true,
      hideCols: 2,
    });

    table.appendTo(this.widgetBody);
  }
}
