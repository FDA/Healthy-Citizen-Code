const log = require('log4js').getLogger('graphql/dev-extreme-filter-resolver');
const { default: sift } = require('sift');
const _ = require('lodash');
const { composeWithPagination } = require('../pagination');
const DevExtremeContext = require('../../request-context/graphql/DevExtremeContext');
const { createTypeByModel, getOrCreateTypeByModel } = require('../type/model');
const { COMPOSER_TYPES, dxQueryWithQuickFilterInput } = require('../type/common');
const { handleGraphQlError } = require('../util');

const paginationFindByDevExtremeFilterResolverName = 'paginationDx';
const findByDevExtremeFilterResolverName = 'findManyDx';
const countByDevExtremeFilterResolverName = 'countDx';

// siftTypes have different filter format for mongo and for sift, other types work for both formats
const siftTypes = [
  'Decimal128',
  'Decimal128[]',
  'ImperialHeight',
  'ImperialWeight',
  'ImperialWeightWithOz',
  'LookupObjectID',
  'LookupObjectID[]',
  'ObjectID',
];

function getItemsForGroups(items, parse, dxQuery, appModel) {
  const appModelForSift = _.cloneDeep(appModel);
  _.each(appModelForSift.fields, (f) => {
    if (siftTypes.includes(f.type)) {
      f.filter = `${f.filter}ForSift`;
    }
  });
  const { conditions: conditionsForSift, meta } = parse(dxQuery, appModelForSift);
  if (!meta.hasArrayFieldInFilter) {
    // Items for array types might be duplicated in many groups
    // If there is no array field in filter then there is no any duplicates
    return items;
  }

  // 1. It's possible to have only one group presented inside $or operator, in this case many conditions will be merged to one correct group
  // Example:
  // { $or: [ { string: ''}, { string: null } ] }
  // 2. It's possible to have group filter combined with simple filter condition. In this case group filter should always be the last element.
  // Example:
  // [
  //     {
  //       "$and": [
  //          { "stringMultiple": "2" },
  //          { "$or":
  //            [
  //             { "stringMultiple": "1" },
  //             { "stringMultiple": "2" },
  //             { "stringMultiple": "3" },
  //            ]
  //          }
  //        ]
  //       }
  //   ]
  const fromCombinedCondition = conditionsForSift.$and ? _.last(conditionsForSift.$and).$or : null;
  const groupConditionsForSift = _.castArray(conditionsForSift.$or || fromCombinedCondition || conditionsForSift);

  const groupFilters = groupConditionsForSift.map((c) => sift(c));
  const groups = {};
  _.each(groupFilters, (val, index) => {
    groups[index] = [];
  });

  _.each(items, (item) => {
    _.each(groupFilters, (groupFilter, index) => {
      const isItemInGroup = groupFilter(item);
      isItemInGroup && groups[index].push(item);
    });
  });
  return _.flatten(_.values(groups));
}

function addFindManyByDevExtremeFilterResolver(type) {
  type.addResolver({
    kind: 'query',
    name: findByDevExtremeFilterResolverName,
    args: {
      filter: dxQueryWithQuickFilterInput,
      perPage: {
        type: 'Int',
      },
      page: {
        type: 'Int',
        defaultValue: 0,
      },
      sort: {
        type: 'String',
        defaultValue: '{_id: 1}',
      },
      isGroupFilter: {
        type: 'Boolean',
        defaultValue: false,
      },
    },
    type: [type],
    resolve: async ({ args, context, paginationContext }) => {
      const { appLib } = context;
      const { modelName } = paginationContext;
      try {
        const {
          controllerUtil,
          butil: { getRequestMeta },
          filterParser: { parse },
        } = appLib;

        const { items, meta } = await controllerUtil.getItems(paginationContext, true);
        log.debug(`Meta: ${getRequestMeta(paginationContext, meta)}`);

        if (!args.isGroupFilter) {
          return items;
        }
        return getItemsForGroups(items, parse, args.filter.dxQuery, paginationContext.appModel);
      } catch (e) {
        handleGraphQlError({ e, message: `Unable to find requested elements`, log, appLib, modelName });
      }
    },
  });

  return { type, resolver: type.getResolver(findByDevExtremeFilterResolverName) };
}

function addCountByDevExtremeFilterResolver(type) {
  type.addResolver({
    kind: 'query',
    name: countByDevExtremeFilterResolverName,
    args: {
      filter: dxQueryWithQuickFilterInput,
    },
    type: 'Int!',
    resolve: async ({ context, paginationContext }) => {
      const { appLib } = context;
      const { modelName } = paginationContext;
      try {
        const { getElementsCount } = appLib.controllerUtil;
        paginationContext.action = 'view';
        return await getElementsCount({ context: paginationContext });
      } catch (e) {
        handleGraphQlError({ e, message: `Unable to count requested elements`, log, appLib, modelName });
      }
    },
  });

  return { type, resolver: type.getResolver(countByDevExtremeFilterResolverName) };
}

function addFindByDevExtremeFilterResolver(model, modelName, isOverride) {
  const typeWithActions = isOverride
    ? createTypeByModel(model, modelName, COMPOSER_TYPES.OUTPUT_WITH_ACTIONS)
    : getOrCreateTypeByModel(model, modelName, COMPOSER_TYPES.OUTPUT_WITH_ACTIONS);
  addFindManyByDevExtremeFilterResolver(typeWithActions);
  addCountByDevExtremeFilterResolver(typeWithActions);

  composeWithPagination(typeWithActions, {
    paginationResolverName: paginationFindByDevExtremeFilterResolverName,
    findResolverName: findByDevExtremeFilterResolverName,
    countResolverName: countByDevExtremeFilterResolverName,
    getPaginationContext: async ({ args, context }) => {
      const { req, appLib } = context;
      return new DevExtremeContext(appLib, req, modelName, args).init();
    },
  });
  return { type: typeWithActions, resolver: typeWithActions.getResolver(paginationFindByDevExtremeFilterResolverName) };
}

module.exports = {
  addFindByDevExtremeFilterResolver,
  paginationFindByDevExtremeFilterResolverName,
  findByDevExtremeFilterResolverName,
  countByDevExtremeFilterResolverName,
};
