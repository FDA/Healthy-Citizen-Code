import lodashGet from 'lodash.get';
import {adverseEventsQuery, prefrencesQuery} from '../../queries'
import $ from '../../../lib/dom';
import Table from '../../../modules/table/table';
import adverseEventsTemplate from './adverse-events.hbs';
import { formatEvents, adverseEventsHeads } from './adverse-events.helpers'
import {widgetError} from '../../../lib/utils';

export default class AdverseEvents {
  constructor(node, options) {
    this.$el = $(node);
    this.options = options;

    this.$loader = $('<div class="loader-wrap"><div class="loader"></div></div>');
    this.$el.append(this.$loader);

    this.fetchData()
      .catch(err => {
        console.error(err);
        widgetError(err.message)
      });
  }

  fetchData() {
    return prefrencesQuery({udid: this.options.udid})
      .then(data => {
        var medications = lodashGet(data, 'medications', []);

        if (medications.length) {
          return adverseEventsQuery(data)
        } else {
          throw new Error('Unable to get adverse events. Medication list is empty.');
        }
      })
      .then(data => {
        this.$loader.remove();
        this.buildWidgetBody();
        this.buildTable(data);
      });
  }

  buildWidgetBody() {
    this.widgetBody = $(adverseEventsTemplate());
    this.$el.append(this.widgetBody);
  }

  buildTable(medications) {
    const data = formatEvents(medications);
    const heads = adverseEventsHeads(data);

    const table = new Table({
      heads, data,
      groupTitle: 'Total number of adverse events:',
      hasGrouping: true,
      accordion: true,
      hideCols: 2
    });

    table.appendTo(this.widgetBody);
  }
}
