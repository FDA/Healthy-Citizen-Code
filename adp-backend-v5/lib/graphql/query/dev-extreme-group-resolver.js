const _ = require('lodash');
const Promise = require('bluebird');
const { schemaComposer } = require('graphql-compose');
const log = require('log4js').getLogger('graphql/dev-extreme-group-resolver');
const { getOrCreateEnum } = require('../type/common');
const { ValidationError } = require('../../errors');
const GraphQlContext = require('../../request-context/graphql/GraphQlContext');

const devExtremeGroupResolverName = 'groupDx';

const dxQueryInputOptional = schemaComposer.createInputTC({
  name: 'dxQueryInputOptional',
  fields: {
    dxQuery: { type: 'String!' },
  },
});

const dxGroupInput = schemaComposer
  .createInputTC({
    name: 'dxGroupInput',
    fields: {
      // TODO: add Enum for selector (in that case we have to create dxGroupInput for each scheme)
      selector: { type: 'String!' },
      desc: { type: 'Boolean', defaultValue: true },
      isExpanded: { type: 'Boolean', defaultValue: false },
      // TODO: add 'groupInterval'
    },
  })
  .getTypePlural();

const dxSummaryInput = schemaComposer
  .createInputTC({
    name: 'dxSummaryInput',
    fields: {
      selector: { type: 'String!' },
      summaryType: getOrCreateEnum('summaryType', ['sum', 'avg', 'min', 'max', 'count']),
    },
  })
  .getTypePlural();

const dxSortInput = schemaComposer
  .createInputTC({
    name: 'dxSortInput',
    fields: {
      selector: { type: 'String!' },
      desc: { type: 'Boolean!' },
    },
  })
  .getTypePlural();

function addDevExtremeGroupResolver(model, modelName) {
  const config = {
    name: `${modelName}Group`,
    fields: {
      // TODO: create Enum type for data field: GroupType and DataType?
      // data: getOrCreateTypeByModel(model, modelName, COMPOSER_TYPES.OUTPUT_WITH_ACTIONS).getTypePlural(),
      data: '[JSON]',
      totalCount: 'Float',
      groupCount: 'Float',
      summary: '[JSON]',
    },
  };
  const type = schemaComposer.createObjectTC(config);
  // const type = getOrCreateTypeByModel(model, modelName, COMPOSER_TYPES.OUTPUT_WITH_ACTIONS);

  type.addResolver({
    kind: 'query',
    name: devExtremeGroupResolverName,
    args: {
      filter: dxQueryInputOptional,
      group: dxGroupInput,
      groupSummary: dxSummaryInput,
      totalSummary: dxSummaryInput,
      requireGroupCount: { type: 'Boolean', defaultValue: false },
      requireTotalCount: { type: 'Boolean', defaultValue: false },
      take: {
        type: 'Int',
      },
      skip: {
        type: 'Int',
        defaultValue: 0,
      },
      sort: dxSortInput,
    },
    type,
    resolve: async ({ args, context }) => {
      try {
        const { appLib, req } = context;
        const graphQlContext = new GraphQlContext(appLib, req, modelName, args);
        const { appModel, userPermissions, inlineContext, userContext, model: dbModel } = graphQlContext;
        args.take = graphQlContext._getLimit(args.take);

        const {
          accessUtil: { getScopeConditionsMeta, getActionFuncsMeta },
          filterParser: { parse },
          butil: { MONGO },
          dba: { getConditionForActualRecord },
        } = appLib;

        const dxConditions = args.filter ? parse(args.filter.dxQuery, appModel) : {};
        const action = 'view';
        const [scopeConditionsMeta, actionFuncsMeta] = await Promise.all([
          getScopeConditionsMeta(appModel, userPermissions, inlineContext, action),
          getActionFuncsMeta(appModel, userPermissions, inlineContext, true),
        ]);
        const scopeConditions = scopeConditionsMeta.overallConditions;
        const conditions = MONGO.and(getConditionForActualRecord(), dxConditions, scopeConditions);
        if (conditions === false) {
          // no data is retrieved with false condition
          return getCommonResponse({}, args);
        }

        const { actionFuncs } = actionFuncsMeta;
        const isEmptyGroup = _.isEmpty(args.group);

        if (isEmptyGroup) {
          return getData({ args, model: dbModel, conditions, appLib, actionFuncs, userContext });
        }

        return getGroups({ args, model: dbModel, conditions, appLib, actionFuncs, userContext });
      } catch (e) {
        log.error(e);
        if (e instanceof ValidationError) {
          throw e;
        }
        throw new Error(`Unable to find requested elements`);
      }
    },
  });

  return { type, resolver: type.getResolver(devExtremeGroupResolverName) };
}

async function getData({ args, model, conditions, appLib, actionFuncs, userContext }) {
  const pipeline = [{ $match: conditions }];
  const { requireTotalCount, totalSummary, groupSummary, group, skip, take, sort } = args;

  pipeline.push({
    $facet: {
      total: getTotalPipeline(requireTotalCount, group, groupSummary, totalSummary),
      data: [{ $sort: getItemsSort(sort) }, { $skip: skip }, { $limit: take }],
    },
  });
  const dbData = (await appLib.dba.aggregatePipeline({ model, pipeline }))[0];

  const response = getCommonResponse(dbData, args);
  response.data = await transformData({ data: dbData.data, appLib, actionFuncs, model, userContext });

  return response;
}

async function getGroups({ args, model, conditions, appLib, actionFuncs, userContext }) {
  const pipeline = [{ $match: conditions }];
  const { requireGroupCount, requireTotalCount, totalSummary, groupSummary, group, skip, take } = args;

  const groupIndex = 0;
  const firstGroup = group[0];
  const groupCount = getGroupCount(requireGroupCount, firstGroup);

  pipeline.push({
    $facet: {
      ...groupCount,
      total: getTotalPipeline(requireTotalCount, group, groupSummary, totalSummary),
      data: [
        getGroupPipeline(group, groupIndex, groupSummary),
        getGroupSort(group, groupIndex),
        { $skip: skip },
        { $limit: take },
      ],
    },
  });

  const dbData = (await appLib.dba.aggregatePipeline({ model, pipeline }))[0];

  const response = getCommonResponse(dbData, args);
  const allGroupsData = dbData.data;
  response.data = await transformGroups({
    allGroupsData,
    group,
    groupIndex,
    groupSummary,
    appLib,
    actionFuncs,
    model,
    userContext,
    currentGroupFilter: conditions,
  });

  return response;
}

function getTotalPipeline(requireTotalCount, group, groupSummary, totalSummary) {
  return [
    {
      $group: {
        _id: null,
        ...getTotalCount(requireTotalCount, group, groupSummary),
        ...getSummaryCondition(totalSummary, 'totalSummary'),
      },
    },
  ];
}

function getGroupPipeline(group, groupIndex, groupSummary) {
  return {
    $group: {
      ...getGroupItemsWithCount(group, groupIndex),
      ...getSummaryCondition(groupSummary, 'groupSummary'),
    },
  };
}

function isExpandedGroup(group, currentGroupIndex) {
  const groupObj = group[currentGroupIndex];
  const isLastGroup = currentGroupIndex === group.length - 1;
  return isLastGroup && groupObj.isExpanded;
}

async function getGroupData({
  group,
  groupIndex,
  groupSummary,
  dbGroupData,
  appLib,
  actionFuncs,
  model,
  userContext,
  currentGroupFilter,
}) {
  const transformedGroup = { key: dbGroupData._id };
  if (!_.isEmpty(group) && groupSummary) {
    transformedGroup.summary = getSummary(groupSummary, dbGroupData, 'groupSummary');
  }

  const isLastGroup = groupIndex === group.length - 1;
  const isExpanded = isExpandedGroup(group, groupIndex);
  if (isLastGroup) {
    if (isExpanded) {
      transformedGroup.items = await transformData({
        data: dbGroupData.items,
        appLib,
        actionFuncs,
        model,
        userContext,
      });
    } else {
      transformedGroup.items = null;
      transformedGroup.count = dbGroupData.count;
    }
  } else {
    // build new query
    const additionalCondition = { [group[groupIndex].selector]: dbGroupData._id };
    const filterForNextGroups = appLib.butil.MONGO.and(currentGroupFilter, additionalCondition);
    const pipeline = [{ $match: filterForNextGroups }];

    const nextGroupIndex = groupIndex + 1;
    pipeline.push(getGroupPipeline(group, nextGroupIndex, groupSummary));
    pipeline.push(getGroupSort(group, nextGroupIndex));

    const nestedDbGroupData = await appLib.dba.aggregatePipeline({ model, pipeline });
    transformedGroup.items = await transformGroups({
      allGroupsData: nestedDbGroupData,
      group,
      groupIndex: nextGroupIndex,
      groupSummary,
      appLib,
      actionFuncs,
      model,
      userContext,
      currentGroupFilter: filterForNextGroups,
    });
  }

  return transformedGroup;
}

function transformGroups({
  allGroupsData,
  group,
  groupIndex,
  groupSummary,
  appLib,
  actionFuncs,
  model,
  userContext,
  currentGroupFilter,
}) {
  return Promise.map(allGroupsData, dbGroupData =>
    getGroupData({
      group,
      groupIndex,
      groupSummary,
      dbGroupData,
      appLib,
      actionFuncs,
      model,
      userContext,
      currentGroupFilter,
    })
  );
}

async function transformData({ data, appLib, actionFuncs, model, userContext }) {
  appLib.accessUtil.addActionsToDocs(data, actionFuncs);
  await appLib.dba.postTransform(data, model.modelName, userContext);

  return data;
}

function getSummary(totalSummary, data, keyPrefixInData) {
  return _.range(0, totalSummary.length).map(i => data[`${keyPrefixInData}${i}`]);
}

function getCommonResponse(dbData, args) {
  const { totalSummary } = args;
  const response = {};

  if (_.isEmpty(dbData.total)) {
    // no items
    response.totalCount = 0;
    response.summary = [];
    response.groupCount = 0;
    response.data = [];
    return response;
  }

  const totalInfo = dbData.total[0];
  if (totalInfo.totalCount) {
    response.totalCount = totalInfo.totalCount;
  }
  if (totalSummary) {
    response.summary = getSummary(totalSummary, totalInfo, 'totalSummary');
  }
  const groupCount = _.get(dbData, 'groupCount.0.value');
  if (groupCount) {
    response.groupCount = groupCount;
  }

  return response;
}

function getGroupCount(requireGroupCount, group) {
  return requireGroupCount ? { groupCount: [{ $group: getGroupIdCondition(group) }, { $count: 'value' }] } : {};
}

/**
 * @param requireTotalCount
 * @param group
 * @param groupSummary
 * @returns {*}
 */
function getTotalCount(requireTotalCount, group, groupSummary) {
  const totalCount = { totalCount: { $sum: 1 } };
  if (requireTotalCount) {
    return totalCount;
  }

  // totalCount may be returned even if requireTotalCount is false
  const isGroupEmpty = _.isEmpty(group);
  if (!isGroupEmpty && !_.get(group, '0.isExpanded')) {
    return totalCount;
  }
  if (isGroupEmpty && !_.isEmpty(groupSummary)) {
    // Tested with presented API https://js.devexpress.com/Demos/WidgetsGalleryDataService/api/Sales:
    // if group is not specified and groupSummary is specified (with any 'selector' and any summaryType, for example 'avg')
    // then 'totalCount' is added
    return totalCount;
  }

  return {};
}

function getGroupIdCondition(group) {
  return { _id: `$${group.selector}` };
}

function getGroupItemsWithCount(group, groupIndex) {
  const isExpanded = isExpandedGroup(group, groupIndex);
  const obj = getGroupIdCondition(group[groupIndex]);
  if (isExpanded) {
    obj.items = { $push: '$$ROOT' };
  } else {
    obj.count = { $sum: 1 };
  }

  return obj;
}

function getGroupSort(group, groupIndex) {
  const { desc } = group[groupIndex];
  // _id always equals group selector
  return { $sort: { _id: desc ? -1 : 1 } };
}

// Example of sort format - [{"selector":"StoreName","desc":true},{"selector":"ProductCategoryName","desc":true}]
function getItemsSort(sort) {
  const mongoSort = {};
  _.each(sort, ({ selector, desc }) => {
    mongoSort[selector] = desc ? -1 : 1;
  });
  return mongoSort;
}

/**
 * https://js.devexpress.com/Documentation/ApiReference/Data_Layer/CustomStore/LoadOptions/#groupSummary
 *
 * @param dxSummary - example = [{ selector: "field", summaryType: "sum" }, { selector: "field2", summaryType: "min" }]
 * summaryType can be "sum", "avg", "min", "max" or "count"
 * @param prefix - needed to name summary fields in $group stage
 */
function getSummaryCondition(dxSummary, prefix) {
  const summary = {};
  _.each(dxSummary, ({ selector, summaryType }, i) => {
    summary[`${prefix}${i}`] = getSummaryTypeValue(selector, summaryType);
  });
  return summary;

  function getSummaryTypeValue(selector, summaryType) {
    if (summaryType === 'count') {
      return { $sum: 1 };
    }
    return { [`$${summaryType}`]: `$${selector}` };
  }
}

module.exports = {
  addDevExtremeGroupResolver,
  devExtremeGroupResolverName,
};
