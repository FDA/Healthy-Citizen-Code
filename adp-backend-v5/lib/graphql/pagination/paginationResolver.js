const _ = require('lodash');
const log = require('log4js').getLogger('graphql/pagination-resolver');
const { preparePaginationTC } = require('./preparePaginationType');
const { ValidationError } = require('../../errors');

const DEFAULT_PER_PAGE = 20;

function preparePaginationResolver(tc, opts) {
  if (!tc || tc.constructor.name !== 'ObjectTypeComposer') {
    throw new Error('First arg for prepareConnectionResolver() should be instance of ObjectTypeComposer');
  }

  const resolverName = opts.paginationResolverName;
  const errorStartMsg = `ObjectTypeComposer(${tc.getTypeName()}) provided to composeWithConnection`;
  if (!opts.countResolverName) {
    throw new Error(`${errorStartMsg} should have option \`opts.countResolverName\`.`);
  }
  const countResolver = tc.getResolver(opts.countResolverName);
  if (!countResolver) {
    throw new Error(
      `${errorStartMsg} should have resolver with name '${opts.countResolverName}' due opts.countResolverName.`
    );
  }
  const countResolve = countResolver.getResolve();

  if (!opts.findResolverName) {
    throw new Error(`${errorStartMsg} should have option \`opts.findResolverName\`.`);
  }
  const findManyResolver = tc.getResolver(opts.findResolverName);
  if (!findManyResolver) {
    throw new Error(
      `${errorStartMsg} should have resolver with name '${opts.findResolverName}' due opts.findResolverName.`
    );
  }
  const findManyResolve = findManyResolver.getResolve();

  const additionalArgs = {};
  if (findManyResolver.hasArg('filter')) {
    const filter = findManyResolver.getArg('filter');
    if (filter) {
      additionalArgs.filter = filter;
    }
  }
  if (findManyResolver.hasArg('sort')) {
    const sort = findManyResolver.getArg('sort');
    if (sort) {
      additionalArgs.sort = sort;
    }
  }

  if (opts.getPaginationContext && !_.isFunction(opts.getPaginationContext)) {
    throw new Error(
      `${errorStartMsg} should have opts.getPaginationContext of 'function' type in case this option is specified.`
    );
  }

  const paginationType = preparePaginationTC(tc);
  const paginationResolver = tc.schemaComposer.createResolver({
    type: paginationType,
    name: resolverName,
    kind: 'query',
    args: {
      page: {
        type: 'Int',
        description: 'Page number for displaying',
      },
      perPage: {
        type: 'Int',
        description: 'Number of results on each page',
      },
      ...additionalArgs,
    },
    resolve: async params => {
      let countPromise;
      let findManyPromise;
      const { projection = {}, args } = params;
      let paginationContext = {};
      try {
        if (opts.getPaginationContext) {
          paginationContext = await opts.getPaginationContext(params);
        }
      } catch (e) {
        if (e instanceof ValidationError) {
          throw e;
        }
        log.error(e.stack);
        throw new Error(`Internal error: unable to build pagination context`);
      }

      const page = parseInt(args.page, 10) || 1;
      if (page <= 0) {
        throw new Error('Argument `page` should be positive number.');
      }
      const actualPerPage = _.get(paginationContext, 'mongoParams.perPage', args.perPage);
      if (+actualPerPage <= 0) {
        throw new Error('Argument `perPage` should be positive number.');
      }

      const countParams = { ...params, paginationContext };
      if (
        projection.count ||
        (projection.pageInfo && (projection.pageInfo.itemCount || projection.pageInfo.pageCount))
      ) {
        countPromise = countResolve(countParams);
      } else {
        countPromise = Promise.resolve(0);
      }

      const findManyParams = { ...params, paginationContext };
      if (projection.items) {
        // combine top level projection
        // (maybe somebody add additional fields via rp.projection)
        // and items (record needed fields)
        findManyParams.projection = { ...projection, ...projection.items };
      } else {
        findManyParams.projection = { ...projection };
      }

      // pass findMany ResolveParams to top resolver
      params.findManyResolveParams = findManyParams;
      params.countResolveParams = countParams;

      // This allows to optimize and not actually call the findMany resolver
      // if only the count is projected
      if ((projection.count || projection.pageInfo) && Object.keys(projection).length === 1) {
        findManyPromise = Promise.resolve([]);
      } else {
        findManyPromise = findManyResolve(findManyParams);
      }

      const clientPerPage = args.perPage || _.get(paginationContext, 'mongoParams.perPage');
      const [items, count] = await Promise.all([findManyPromise, countPromise]);
      return getPaginationInfo({ items, page, clientPerPage, actualPerPage, count });
    },
  });
  paginationType.setResolver(resolverName, paginationResolver);

  return paginationResolver;
}

function getPaginationInfo({ items, page, clientPerPage, actualPerPage, count }) {
  const isGetMoreThanLimit = items.length > actualPerPage;
  const itemsToReturn = isGetMoreThanLimit ? items.slice(0, actualPerPage) : items;
  return {
    count,
    items: itemsToReturn,
    pageInfo: {
      currentPage: page,
      pageCount: Math.ceil(count / actualPerPage),
      perPage: clientPerPage,
      limit: actualPerPage,
      itemsOnPage: itemsToReturn.length,
      itemCount: count,
      hasPreviousPage: page > 1,
      hasNextPage: isGetMoreThanLimit,
    },
  };
}

module.exports = {
  DEFAULT_PER_PAGE,
  preparePaginationResolver,
};
