const { ObjectTypeComposer } = require('graphql-compose');

// PaginationInfo should be global
const PaginationInfoTC = ObjectTypeComposer.createTemp({
  name: 'PaginationInfo',
  fields: {
    currentPage: {
      type: 'Int!',
      description: 'Current page number',
    },
    pageCount: {
      type: 'Int',
      description: 'Total number of pages',
    },
    perPage: {
      type: 'Int!',
      description: 'Number of items per page specified by client',
    },
    limit: {
      type: 'Int',
      description:
        'Allowed number of items per page recalculated considering user permissions and collection preferences',
    },
    itemsOnPage: {
      type: 'Int',
      description: 'Number of retrieved items on current page',
    },
    itemCount: {
      type: 'Int',
      description: 'Total number of items',
    },
    hasPreviousPage: {
      type: 'Boolean',
      description: 'When paginating backwards, are there more items?',
    },
    hasNextPage: {
      type: 'Boolean',
      description: 'When paginating forwards, are there more items?',
    },
  },
});

function preparePaginationInfoTC(sc) {
  // Pagination Info can be overrided via SchemaComposer registry
  if (sc.hasInstance('PaginationInfo', ObjectTypeComposer)) {
    return sc.get('PaginationInfo');
  }
  sc.set('PaginationInfo', PaginationInfoTC);
  return PaginationInfoTC;
}

function getPaginationTCName(tc) {
  return `${tc.getTypeName()}Pagination`;
}

function preparePaginationTC(tc) {
  const { schemaComposer } = tc;
  const name = getPaginationTCName(tc);

  if (schemaComposer.has(name)) {
    return schemaComposer.getOTC(name);
  }

  const paginationTC = schemaComposer.createObjectTC({
    name,
    description: 'List of items with pagination.',
    fields: {
      count: {
        type: 'Int',
        description: 'Total object count.',
      },
      items: {
        type: () => [tc],
        description: 'Array of objects.',
      },
      pageInfo: {
        type: preparePaginationInfoTC(schemaComposer).getTypeNonNull(),
        description: 'Information to aid in pagination.',
      },
    },
  });

  return paginationTC;
}

module.exports = {
  preparePaginationTC,
  preparePaginationInfoTC,
  getPaginationTCName,
};
