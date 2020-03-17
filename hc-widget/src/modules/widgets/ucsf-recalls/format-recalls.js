import openFdaHelpers from '../../open-fda-helpers';
import recallDesc from './recall-desc';

export function formatRecalls(recallLists) {
  return recallLists.map(({ list, display, itemCount }) => {
    return {
      display, itemCount,
      list: list.map(_formatRecall),
    };
  });
}

function _formatRecall(recall) {
  return {
    'Product Description': createRecall(recall.productDescription),
    'Recall Start Date': createRecall(recall.recallInitiationDate, openFdaHelpers.dateToMmDdYyyy, 'Date'),
    'Recall Reason': createRecall(recall.reasonForRecall),
    'Classification': (() => {
      let formatted = recallDesc[recall.classification];
      if (formatted) {
        return createRecall(formatted);
      } else {
        return createRecall(recall.classification)
      }
    })(),
    'Recalling Firm': createRecall(recall.recallingFirm),
  };
}

export function getHeads() {
  return [
    'Product Description', 'Recall Start Date', 'Recall Reason',
    'Classification', 'Recalling Firm',
  ];
}

function createRecall(data, formatFn, type) {
  return {
    type,
    value: data,
    view: formatFn ? formatFn(data) : data
  }
}
