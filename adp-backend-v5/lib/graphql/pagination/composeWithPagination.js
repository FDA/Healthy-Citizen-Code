const { preparePaginationResolver } = require('./paginationResolver');

function composeWithPagination(typeComposer, opts) {
  if (!typeComposer || typeComposer.constructor.name !== 'ObjectTypeComposer') {
    throw new Error('You should provide ObjectTypeComposer instance to composeWithPagination method');
  }

  if (!opts) {
    throw new Error('You should provide non-empty options to composeWithPagination');
  }

  const resolverName = opts.paginationResolverName;

  // always create new resolver since it might be changed dynamically
  // if (typeComposer.hasResolver(resolverName)) {
  //   return typeComposer;
  // }

  const resolver = preparePaginationResolver(typeComposer, opts);

  typeComposer.setResolver(resolverName, resolver);
  return typeComposer;
}

module.exports = composeWithPagination;
