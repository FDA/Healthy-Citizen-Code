import Iframe from '../../iframe';
import {adverseEventsQuery, prefrencesQuery} from '../../queries'
import $ from '../../../lib/dom';
import Table from '../../../modules/table/table';
import adverseEventsTemplate from './adverse-events.hbs';
import { formatEvents, adverseEventsHeads } from './adverse-events.helpers'

export default class AdverseEvents {
  constructor(node, options) {
    this.options = options;
    this.options.events = {
      onLoad: this.onIframeLoad.bind(this)
    };

    new Iframe(node, options);
  }

  onIframeLoad(iframe) {
    this.parent = iframe;
    this.$loader = $('<div class="loader-wrap"><div class="loader"></div></div>');
    this.parent.append(this.$loader);

    this.fetchData()
      .catch(err => {
        console.error(err);
        this.parent.showMessage(err.message);
      });
  }

  fetchData() {
    return prefrencesQuery({udid: this.options.udid})
      .then(data => {
        if ('medications' in data) {
          return adverseEventsQuery(data)
        } else {
          throw new Error('Unable to get adverse events. Medication list is empty.');
        }
      })
      .then(data => {
        this.$loader.remove();
        this.buildTable(data);
      });
  }

  buildTable(medications) {
    const data = formatEvents(medications);
    const heads = adverseEventsHeads(data);

    const widgetBody = $(adverseEventsTemplate());
    const table = new Table({
      heads, data,
      groupTitle: 'Total number of adverse events:',
      hasGrouping: true,
      accordion: true,
      hideCols: 2
    });

    table.appendTo(widgetBody);
    this.parent.append(widgetBody);
  }
}
