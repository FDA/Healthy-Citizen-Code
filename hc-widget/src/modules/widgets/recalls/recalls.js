import hcWidgetAPI from '../../api';
import $ from '../../../lib/dom';
import Table from '../../../modules/table/table';
import recallsTemplate from './recalls.hbs';
import openFdaHelpers from '../../../modules/open-fda-helpers';
import {widgetError} from '../../../lib/utils';

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
        'Start Date': createRecall(recall.recall_initiation_date, openFdaHelpers.openFdaDate, 'Date'),
        'Status': createRecall(recall.status),
        'Classification': createRecall(recall.classification),
        'Firm': createRecall(recall.recalling_firm),
        'Coverage Area': createRecall(recall.distribution_pattern),
        'Reason for Recall': createRecall(recall.reason_for_recall),
        'Product Information': createRecall(recall.code_info)
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
      .catch(err => {
        console.error(err);
        widgetError(err.message);
      });
  }

  fetchData() {
    return hcWidgetAPI.getRecalls(this.options)
      .then(data => {
        if (data.length) {
          this.buildWidgetBody();
          this.buildTable(data);
        } else {
          throw new Error('Unable to get recalls.');
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
    this.widgetBody = $(recallsTemplate());
    this.$el.append(this.widgetBody);
  }

  buildTable(recalls) {
    const data = formatRecalls(recalls);
    const heads = this.heads(data);

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
