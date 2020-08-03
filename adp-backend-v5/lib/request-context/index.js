module.exports = {
  graphQl: {
    DevExtremeContext: require('./graphql/DevExtremeContext'),
    FilterContext: require('./graphql/FilterContext'),
    LookupContext: require('./graphql/LookupContext'),
    GraphQlContext: require('./graphql/GraphQlContext'),
    TreeSelectorContext: require('./graphql/TreeSelectorContext'),
    MongoQueryContext: require('./graphql/MongoQueryContext'),
  },
  datatables: {
    DatatablesContext: require('./datatables/DatatablesContext'),
    LookupContext: require('./datatables/LookupContext'),
    TreeSelectorContext: require('./datatables/TreeSelectorContext'),
  },
};
