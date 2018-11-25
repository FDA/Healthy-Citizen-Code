function getGraphqlConfig(graphiQlRoute, graphQlRoute) {
  const paths = {};

  paths[graphiQlRoute] = {
    get: {
      summary: `Interactive UI that helps you to send GraphQL queries. More: https://github.com/graphql/graphiql`,
      description: `In left pan press Ctrl+Space for autocomplete your queries.
In right pan ('Documentation Explorer') you can familiarize yourself with type structures.  

By default a single query called "Pagination" can be applied to models.
It contains following args:
- filter - specify here a filtering condition by path 'filter.mongoQuery'. This is a string representing mongo condition.
- sort - a string representing mongo sort condition
- page - page number
- perPage - number of results on page

Query example:
\`\`\`json
{
  recalls(page: 2,  perPage: 5 , sort: "{'rawData.city': 1}", filter: {mongoQuery: "{'rawData.report_date': {'$gte':'20101112'} }"}) {
    items {
      rawData
      id
      
    }
    pageInfo {
      perPage
      currentPage
      pageCount
      itemCount
      hasNextPage
      hasPreviousPage
    }
  }
}
\`\`\`  

By default following mutations can be applied to models:
- UpsertOne - updates first found item by matched condition. If item does not exist creates it.
- UpdateOne - updates first found item by matched condition. If item does not exist nothing is changed.
- DeleteMany - delete many items by matched condition.
- DeleteOne - delete first item  by matched condition.
- Create - creates item.
`,
      tags: ['GraphQL'],
    },
  };
  paths[graphQlRoute] = {
    post: {
      summary: `Single endpoint which handles all requests to the server`,
      description: `Example of query request:
POST /graphql
Content-Type: application/json
Request payload:
\`\`\`json
{
  "query": "{  recalls(page: 2,  perPage: 5 , sort: \\"{'rawData.city': 1}\\", filter: {mongoQuery: \\"{'rawData.report_date': {'$gte':'20101112'} }\\"}) {    items {      rawData      id          }    pageInfo {      perPage      currentPage      pageCount      itemCount      hasNextPage      hasPreviousPage    }  }}",
  "variables": null,
  "operationName": null
}
\`\`\``,
      tags: ['GraphQL'],
    },
  };
  return { paths };
}

module.exports = { getGraphqlConfig };
