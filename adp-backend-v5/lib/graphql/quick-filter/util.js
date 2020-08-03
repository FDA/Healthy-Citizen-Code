const JSON5 = require('json5');
const { ValidationError } = require('../../errors');

async function getQuickFilterConditions(appLib, quickFilterId, userContext) {
  if (!quickFilterId) {
    return {};
  }
  const quickFilter = (
    await appLib.dba.getItemsUsingCache({
      model: appLib.db.model('quickFilters'),
      userContext,
      mongoParams: { conditions: { _id: quickFilterId } },
    })
  )[0];
  if (!quickFilter) {
    throw new ValidationError(`Unable to find quickFilter with id '${quickFilterId}'`);
  }
  // filter is already validated when stored in db
  return JSON5.parse(quickFilter.filter);
}

module.exports = {
  getQuickFilterConditions,
};
