import { fetchAdverseEventsForMedications } from '../../../lib/api/adverse-events/adverse-events-for-medications';
import $ from '../../../lib/utils/dom';
import Table from '../../../modules/table/table';
import adverseEventsTemplate from './adverse-events.hbs';
import { formatEvents, adverseEventsHeads } from './adverse-events.helpers'
import { showErrorToUser } from '../../../lib/utils/utils';
import { ResponseError } from '../../../lib/exceptions';

export default class AdverseEvents {
  constructor(node, options) {
    this.$el = $(node);
    this.options = options;

    this.$loader = $('<div class="loader-wrap"><div class="loader"></div></div>');
    this.$el.append(this.$loader);

    this.fetchData()
      .catch((err) => {
        showErrorToUser(ResponseError.ADVERSE_EVENTS_EMPTY);
        console.log(err);
      });
  }

  fetchData() {
    return fetchAdverseEventsForMedications(this.options)
      .then((events) => {
        this.$loader.remove();
        this.buildWidgetBody();
        this.buildTable(events);
      });
  }

  buildWidgetBody() {
    this.widgetBody = $(adverseEventsTemplate());
    this.$el.append(this.widgetBody);
  }

  buildTable(events) {
    const data = formatEvents(events);
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
