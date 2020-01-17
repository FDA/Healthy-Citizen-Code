import $ from '../../../lib/utils/dom';
import Table from '../../../modules/table/table';
import recallsTemplate from './ucsf-recalls.hbs';
import { ResponseError } from '../../../lib/exceptions';
import { fetchRecallsForUCSF } from './api';
import { formatRecalls, getHeads } from './format-recalls';
import { showErrorToUser } from '../../../lib/utils/utils';


export default class UcsfRecalls {
  constructor(node, options) {
    this.$el = $(node);
    this.options = options;

    this.fetchData();
  }

  fetchData() {
    return fetchRecallsForUCSF(this.options)
      .then((recalls) => {
        this.buildWidgetBody();
        this.buildTable(recalls);
      })
      .catch((err) => {
        if (err instanceof ResponseError) {
          showErrorToUser(err.message);
        }
        console.error(err);
      });
  }

  buildWidgetBody() {
    this.widgetBody = $(recallsTemplate());
    this.$el.append(this.widgetBody);
  }

  buildTable(recalls) {
    const data = formatRecalls(recalls);
    const heads = getHeads();

    const table = new Table({
      heads, data,
      groupTitle: 'Total number of recalls:',
      hasGrouping: true,
      accordion: true,
      hideCols: 2,
      sortBy: 'Recall Start Date',
      order: 'desc',
      tableClass: 'ucsf-recalls-table'
    });

    table.appendTo(this.widgetBody);
  }
}
