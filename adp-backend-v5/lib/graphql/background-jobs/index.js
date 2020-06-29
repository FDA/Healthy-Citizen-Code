const _ = require('lodash');
const { schemaComposer } = require('graphql-compose');
const log = require('log4js').getLogger('lib/graphql-datasets');
const { ValidationError, AccessError } = require('../../errors');

const { getOrCreateTypeByModel } = require('../type/model');
const { composeWithPagination } = require('../pagination');

const { deleteOneResolverName, deleteOutputType } = require('../mutation');
const DevExtremeContext = require('../../request-context/graphql/DevExtremeContext');
const GraphQlContext = require('../../request-context/graphql/GraphQlContext');
const { COMPOSER_TYPES, dxQueryInputRequired } = require('../type/common');
const { handleGraphQlError } = require('../util');
const { filterWithSift, getSiftFilteringFunc } = require('../../util/sift');

const paginationBackgroundJobsResolverName = 'paginationBackgroundJobs';
const findBackgroundJobsResolverName = 'findBackgroundJobs';
const countBackgroundJobsResolverName = 'countBackgroundJobs';

const stateFieldName = 'state';
const queueNameFieldName = 'queueName';

function getDeletePermissionConditions(userPermissions, user) {
  if (userPermissions.has('deleteAllBackgroundJobs')) {
    return true;
  }
  if (userPermissions.has('deleteOwnBackgroundJobs')) {
    return { 'data.creator._id': user.creator._id.toString() };
  }
  return false;
}

function getViewPermissionConditions(userPermissions, user) {
  if (userPermissions.has('viewAllBackgroundJobs')) {
    return true;
  }
  if (userPermissions.has('viewOwnBackgroundJobs')) {
    return { 'data.creator._id': user.creator._id.toString() };
  }
  return false;
}

function handleConditionsByQueueNameField(conditions) {
  // check only simple $eq, other operations like startsWith or regex are harder to implement
  const queueName = _.get(conditions, `${queueNameFieldName}.$eq`);
  if (queueName) {
    // remove filtering by queueNameFieldName since redis will return only records for queue with queueName
    delete conditions[queueNameFieldName];
    return [queueName];
  }
  return null;
}

function handleConditionsByStateField(conditions) {
  // for now frontend sends only filter like [list, '=', [val1, val2] ] which is transformed as $in
  // this function should be changed for other operations i.e. '<>'
  const jobTypes = _.get(conditions, `${stateFieldName}.$in`);
  delete conditions[stateFieldName];
  return jobTypes;
}

function addPaginationResolver(type, backgroundJobsModelName) {
  addFindBackgroundJobsResolver(type);
  addCountBackgroundJobsResolver(type);

  const paginationType = composeWithPagination(type, {
    paginationResolverName: paginationBackgroundJobsResolverName,
    getPaginationContext: async ({ args, context }) => {
      const { req, appLib } = context;
      const devExtremeContext = await new DevExtremeContext(appLib, req, backgroundJobsModelName, args).init();

      const { conditions, sort, perPage, skip } = devExtremeContext.mongoParams;

      const { userPermissions, user } = devExtremeContext;
      const viewPermissionConditions = getViewPermissionConditions(userPermissions, user);
      if (viewPermissionConditions === false) {
        devExtremeContext.jobs = [];
        devExtremeContext.count = 0;
        return devExtremeContext;
      }

      const jobTypes = handleConditionsByStateField(conditions);
      const queueNames = handleConditionsByQueueNameField(conditions);
      const rawJobs = await appLib.queue.getJobs({ queueNames, jobTypes });
      const allJobs = rawJobs.filter((j) => j).map((job) => appLib.queue.getJobJson(job));

      const overallConditions = appLib.butil.MONGO.and(conditions, viewPermissionConditions);
      const filteredJobs = filterWithSift(allJobs, overallConditions);

      let sortedJobs;
      if (_.isEmpty(sort)) {
        sortedJobs = filteredJobs;
      } else {
        sortedJobs = _.orderBy(
          filteredJobs,
          _.keys(sort),
          _.values(sort).map((val) => (val === 1 ? 'asc' : 'desc'))
        );
      }

      const jobs = sortedJobs.slice(skip, skip + perPage);

      const deletePermissionConditions = getDeletePermissionConditions(userPermissions, user);
      const isDeleteAllowedFunc = getSiftFilteringFunc(deletePermissionConditions);
      _.each(jobs, (job) => {
        job._actions = {
          view: true,
          deleteBackgroundJob: isDeleteAllowedFunc(job),
        };
      });

      devExtremeContext.jobs = jobs;
      devExtremeContext.count = filteredJobs.length;

      return devExtremeContext;
    },
    findResolverName: findBackgroundJobsResolverName,
    countResolverName: countBackgroundJobsResolverName,
  });

  return paginationType.getResolver(paginationBackgroundJobsResolverName);

  function addFindBackgroundJobsResolver() {
    type.addResolver({
      kind: 'query',
      name: findBackgroundJobsResolverName,
      type: [type],
      args: {
        filter: dxQueryInputRequired,
        sort: { type: 'String', defaultValue: '{}' },
        perPage: { type: 'Int' },
        page: { type: 'Int', defaultValue: 0 },
      },
      resolve: async ({ paginationContext }) => paginationContext.jobs,
    });
  }

  function addCountBackgroundJobsResolver() {
    type.addResolver({
      kind: 'query',
      name: countBackgroundJobsResolverName,
      type: 'Int!',
      resolve: async ({ paginationContext }) => paginationContext.count,
    });
  }
}

function addDeleteResolver(type, backgroundJobsModelName) {
  type.addResolver({
    kind: 'mutation',
    name: deleteOneResolverName,
    args: {
      filter: schemaComposer
        .createInputTC({
          name: 'BackgroundJobIdInput',
          fields: {
            queueName: 'String!',
            jobId: 'String!',
          },
        })
        .getTypeNonNull(),
    },
    type: deleteOutputType,
    resolve: async ({ args, context }) => {
      const { req, appLib } = context;
      try {
        const { userPermissions, user } = await new GraphQlContext(appLib, req, backgroundJobsModelName, args).init();

        const deletePermissionConditions = getDeletePermissionConditions(userPermissions, user);
        if (deletePermissionConditions === false) {
          throw new AccessError(`Unable to delete record`);
        }

        const { queueName, jobId } = args.filter;
        const job = await appLib.queue.getJob(queueName, jobId);
        if (!job) {
          throw new ValidationError(`Unable to delete record`);
        }

        const isDeleteAllowedFunc = getSiftFilteringFunc(deletePermissionConditions);
        const isAllowedToDeleteJob = isDeleteAllowedFunc(job);
        if (!isAllowedToDeleteJob) {
          throw new AccessError(`Unable to delete record`);
        }

        await job.remove();
        return { deletedCount: 1 };
      } catch (e) {
        handleGraphQlError(e, `Unable to delete record`, log, appLib);
      }
    },
  });

  return type.getResolver(deleteOneResolverName);
}

module.exports = ({ appLib, backgroundJobsModelName }) => {
  const m = {};
  backgroundJobsModelName = 'backgroundJobs';
  const backgroundJobsModel = appLib.appModel.models[backgroundJobsModelName];

  m.backgroundJobsResolvers = {};

  const type = getOrCreateTypeByModel(backgroundJobsModel, backgroundJobsModelName, COMPOSER_TYPES.OUTPUT_WITH_ACTIONS);
  // background jobs are not stored in mongo therefore don't have _id field
  // type.removeField('_id');

  const paginationResolver = addPaginationResolver(type, backgroundJobsModelName);
  m.backgroundJobsResolvers.pagination = paginationResolver;

  const deleteResolver = addDeleteResolver(type, backgroundJobsModelName);
  m.backgroundJobsResolvers.deleteOne = deleteResolver;

  return m;
};
