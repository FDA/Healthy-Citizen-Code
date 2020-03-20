const RJSON = require('relaxed-json');
const { ValidationError } = require('../../errors');

async function getQuickFilterConditions(appLib, quickFilterId, userContext) {
  if (!quickFilterId) {
    return {};
  }
  const quickFilter = (
    await appLib.dba.getItemsUsingCache({
      model: appLib.db.model('quickFilters'),
      userContext,
      mongoParams: { _id: quickFilterId },
    })
  )[0];
  if (!quickFilter) {
    throw new ValidationError(`Unable to find quickFilter with id '${quickFilterId}'`);
  }
  // filter is already validated when stored in db
  return RJSON.parse(quickFilter.filter);
}

module.exports = {
  getQuickFilterConditions,
};
