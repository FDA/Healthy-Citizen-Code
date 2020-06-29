const _ = require('lodash');
const Promise = require('bluebird');
const { schemaComposer } = require('graphql-compose');
const log = require('log4js').getLogger('graphql/dev-extreme-group-resolver');
const { getOrCreateEnum, dxQueryWithQuickFilterInput } = require('../type/common');
const { handleGraphQlError } = require('../util');
const { getQuickFilterConditions } = require('../../graphql/quick-filter/util');
const GraphQlContext = require('../../request-context/graphql/GraphQlContext');
const { ValidationError } = require('../../errors');

const devExtremeGroupResolverName = 'groupDx';

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
      filter: dxQueryWithQuickFilterInput,
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
      const { appLib, req } = context;
      try {
        const graphQlContext = new GraphQlContext(appLib, req, modelName, args);
        const { appModel, userPermissions, inlineContext, userContext, model: dbModel } = graphQlContext;
        args.take = graphQlContext._getLimit(args.take);

        const {
          accessUtil: { getScopeConditionsMeta, getActionFuncsMeta },
          filterParser: { parse },
          butil: { MONGO },
          dba: { getConditionForActualRecord },
        } = appLib;

        const { filter: { dxQuery, quickFilterId } = {} } = args;
        const { conditions: dxConditions } = parse(dxQuery, appModel);
        const action = 'view';
        const [scopeConditionsMeta, quickFilterConditions, actionFuncsMeta] = await Promise.all([
          getScopeConditionsMeta(appModel, userPermissions, inlineContext, action),
          getQuickFilterConditions(appLib, quickFilterId, userContext),
          getActionFuncsMeta(appModel, userPermissions, inlineContext, true),
        ]);
        const scopeConditions = scopeConditionsMeta.overallConditions;
        const conditions = MONGO.and(
          getConditionForActualRecord(),
          dxConditions,
          quickFilterConditions,
          scopeConditions
        );
        if (conditions === false) {
          // no data is retrieved with false condition
          return getCommonResponse({}, args);
        }

        const { actionFuncs } = actionFuncsMeta;
        const isEmptyGroup = _.isEmpty(args.group);

        if (isEmptyGroup) {
          return await getData({ args, model: dbModel, conditions, appLib, actionFuncs, userContext });
        }

        return await getGroups({ args, model: dbModel, conditions, appLib, actionFuncs, userContext, appModel });
      } catch (e) {
        handleGraphQlError(e, `Unable to find requested elements`, log, appLib);
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

function validateGroups(group, appModel) {
  // check for `MongoError: cannot sort with keys that are parallel arrays`
  let numberOfArrayFields = 0;
  _.each(group, (g) => {
    const fieldSchema = appModel.fields[g.selector];
    if (fieldSchema.type.endsWith('[]')) {
      numberOfArrayFields++;
    }
  });
  if (numberOfArrayFields > 1) {
    throw new ValidationError('Unable to sort by more than 1 array fields');
  }
}

async function getGroups({ args, model, conditions, appLib, actionFuncs, userContext, appModel }) {
  const { requireGroupCount, requireTotalCount, totalSummary, groupSummary, group, skip, take } = args;
  validateGroups(group, appModel);
  transformGroupOptions(group, appModel);

  const groupIndex = 0;
  const firstGroup = group[0];
  const groupCount = getGroupCount(requireGroupCount, firstGroup, appModel);
  const { preTransformPipeline, postTransformPipeline } = getTransformPipelinesForGroup(group, groupIndex, appModel);

  const pipeline = [{ $match: conditions }];
  pipeline.push({
    $facet: {
      ...groupCount,
      total: getTotalPipeline(requireTotalCount, group, groupSummary, totalSummary),
      data: [
        ...preTransformPipeline,
        getGroupPipeline(group, groupIndex, groupSummary, appModel),
        getGroupSort(group, groupIndex),
        ...postTransformPipeline,
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
    appModel,
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

function transformGroupOptions(group, appModel) {
  _.each(group, (g) => {
    const { selector } = g;
    const fieldSchema = appModel.fields[selector];
    if (fieldSchema.type.endsWith('[]')) {
      g.originalSelector = selector;
      // create selector to group by unwinded duplicated field
      g.selector = `_${selector}_`;
    }
  });
}

function getTransformPipelinesForGroup(group, groupIndex, appModel) {
  let preTransformPipeline = [];
  let postTransformPipeline = [];

  const { selector, originalSelector } = group[groupIndex];
  const fieldName = originalSelector || selector;
  const fieldSchema = appModel.fields[fieldName];
  if (fieldSchema.type.endsWith('[]')) {
    preTransformPipeline = [
      { $addFields: { [selector]: `$${originalSelector}` } },
      { $unwind: { path: `$${selector}`, preserveNullAndEmptyArrays: true } },
    ];
    postTransformPipeline = [{ $unset: [`items.${selector}`] }];
  }

  return { preTransformPipeline, postTransformPipeline };
}

function getGroupPipeline(group, groupIndex, groupSummary, appModel) {
  return {
    $group: {
      ...getGroupItemsWithCount(group, groupIndex, appModel),
      ...getSummaryCondition(groupSummary, 'groupSummary'),
    },
  };
}

function isExpandedGroup(group, currentGroupIndex) {
  const groupObj = group[currentGroupIndex];
  const isLastGroup = currentGroupIndex === group.length - 1;
  return isLastGroup && groupObj.isExpanded;
}

// Necessary for transformable fields.
// Let's consider a field of 'ImperialHeight' type with [1, 0] value (1 feet, 0 inches) which is presented as 30 in db (metric value).
// For { key: 30 } (without key group transformation) DevExtreme sends invalid request for items of this group: ["imperialHeight","=", 30] (in metric system)
// For { key: [1, 0] } (with key group transformation) DevExtreme sends valid request: ["imperialHeight","=",[1,0]] (imperial system)
async function getGroupKey({ groupIdValue, groupSelector, appModel, userContext, appLib }) {
  const { schemaName } = appModel;
  const fieldSchema = appModel.fields[groupSelector];
  const fieldTransform = _.get(fieldSchema, 'transform');

  if (fieldSchema.type === 'LookupObjectID' && _.isEmpty(groupIdValue)) {
    // lookups are grouped be { _id, table, label } condition and if lookup value is null the groupIdValue is empty object {}
    return null;
  }

  if (!fieldTransform) {
    return groupIdValue;
  }
  const data = [{ [groupSelector]: groupIdValue }];
  const transformedData = await appLib.dba.postTransform(data, schemaName, userContext);
  return transformedData[0][groupSelector];
}

function getPreviousGroupCondition(groupIdValue, appModel, groupSelector) {
  const { type } = appModel.fields[groupSelector];
  if (type === 'LookupObjectID') {
    if (_.isEmpty(groupIdValue)) {
      // lookups are grouped be { _id, table, label } condition and if lookup value is null the groupIdValue is empty object {}
      return { [groupSelector]: null };
    }
    return {
      [`${groupSelector}._id`]: groupIdValue._id,
      [`${groupSelector}.table`]: groupIdValue.table,
    };
  }

  if (groupIdValue === null && type.endsWith('[]')) {
    // Since grouping uses $unwind for array fields it adds both values { arrField: [] } and { arrField: null } to group { _id: null }
    // However, filter { arrField: null } does not retrieve { arrField: [] } value.
    return { $or: [{ [groupSelector]: null }, { [groupSelector]: [] }] };
  }
  return { [groupSelector]: groupIdValue };
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
  appModel,
}) {
  const groupSelector = group[groupIndex].originalSelector || group[groupIndex].selector;
  const groupKey = await getGroupKey({
    groupIdValue: dbGroupData._id,
    appModel,
    groupSelector,
    userContext,
    appLib,
  });
  const transformedGroup = { key: groupKey };
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
    const prevGroupCondition = getPreviousGroupCondition(dbGroupData._id, appModel, groupSelector);
    const filterForNextGroups = appLib.butil.MONGO.and(currentGroupFilter, prevGroupCondition);

    const nextGroupIndex = groupIndex + 1;
    const { preTransformPipeline, postTransformPipeline } = getTransformPipelinesForGroup(
      group,
      nextGroupIndex,
      appModel
    );

    const pipeline = [
      { $match: filterForNextGroups },
      ...preTransformPipeline,
      getGroupPipeline(group, nextGroupIndex, groupSummary, appModel),
      getGroupSort(group, nextGroupIndex),
      ...postTransformPipeline,
    ];

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
      appModel,
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
  appModel,
}) {
  return Promise.map(allGroupsData, (dbGroupData) =>
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
      appModel,
    })
  );
}

async function transformData({ data, appLib, actionFuncs, model, userContext }) {
  appLib.accessUtil.addActionsToDocs(data, actionFuncs);
  await appLib.dba.postTransform(data, model.modelName, userContext);

  return data;
}

function getSummary(totalSummary, data, keyPrefixInData) {
  return _.range(0, totalSummary.length).map((i) => data[`${keyPrefixInData}${i}`]);
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

function getGroupCount(requireGroupCount, group, appModel) {
  return requireGroupCount
    ? { groupCount: [{ $group: getGroupIdCondition(group, appModel) }, { $count: 'value' }] }
    : {};
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

function getGroupIdCondition(group, appModel) {
  const { selector } = group;
  const isLookupType = _.get(appModel, `fields.${selector}.type`, '').startsWith('LookupObjectID');
  if (isLookupType) {
    // actual condition is { _id, table }, but label is required for frontend "key" field to show by which value a group is created
    return { _id: { _id: `$${selector}._id`, table: `$${selector}.table`, label: `$${selector}.label` } };
  }

  return { _id: `$${selector}` };
}

function getGroupItemsWithCount(group, groupIndex, appModel) {
  const isExpanded = isExpandedGroup(group, groupIndex);
  const obj = getGroupIdCondition(group[groupIndex], appModel);
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
