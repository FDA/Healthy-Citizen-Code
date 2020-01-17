import $ from '../../../lib/utils/dom';
import Table from '../../../modules/table/table';
import recallsTemplate from './recalls.hbs';
import openFdaHelpers from '../../../modules/open-fda-helpers';
import { showErrorToUser } from '../../../lib/utils/utils';
import { fetchRecalls } from './api';
import { ResponseError } from '../../../lib/exceptions'

function createRecall(data, formatFn, type) {
  return {
    type,
    value: data,
    view: formatFn ? formatFn(data) : data
  }
}

function formatRecalls(recalls) {
  recalls.forEach(recallList => {
    recallList.list = recallList.list.map(recall => {
      return {
        'Start Date': createRecall(recall.recallInitiationDate, openFdaHelpers.dateToMmDdYyyy, 'Date'),
        'Status': createRecall(recall.status),
        'Classification': createRecall(recall.classification),
        'Firm': createRecall(recall.recallingFirm),
        'Coverage Area': createRecall(recall.distributionPattern),
        'Reason for Recall': createRecall(recall.reasonForRecall),
        'Product Information': createRecall(recall.codeInfo)
      }
    });
  });

  return recalls;
}

export default class Recalls {
  constructor(node, options) {
    this.$el = $(node);
    this.options = options;

    this.fetchData()
      .catch((err) => {
        console.error(err);
        showErrorToUser(ResponseError.RECALLS_EMPTY);
      });
  }

  fetchData() {
    return fetchRecalls(this.options)
      .then(data => {
        if (data.length) {
          this.buildWidgetBody();
          this.buildTable(data);
        } else {
          throw new ResponseError(ResponseError.RECALLS_EMPTY);
        }
      });
  }

  heads() {
    return [
      'Start Date', 'Status', 'Classification', 'Firm',
      'Coverage Area', 'Reason for Recall', 'Product Information',
    ]
  }

  buildWidgetBody() {
    this.widgetBody = $(recallsTemplate());
    this.$el.append(this.widgetBody);
  }

  buildTable(recalls) {
    const data = formatRecalls(recalls);
    const heads = this.heads();

    const table = new Table({
      heads, data,
      groupTitle: 'Total number of recalls:',
      hasGrouping: true,
      accordion: true,
      hideCols: 2,
      order: 'desc'
    });

    table.appendTo(this.widgetBody);
  }
}
