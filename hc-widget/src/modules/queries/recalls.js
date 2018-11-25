import { hcUrl } from '../../../config';
import { GraphQLClient } from 'graphql-request/dist/src/index';

const options = {
  headers: {'Content-Type': 'application/json'},
};
const endpoint = `${hcUrl}/graphql`;
const client = new GraphQLClient(endpoint, options);

export function recallByProductDescriptionQuery (productDescription) {
  const status = 'Ongoing';
  const query = getQuery(productDescription, status);
  return client.request(query);

  function getQuery (productDescription, status, page = 1) {
    return `{
      recalls (filter: {mongoQuery: "${getMongoQuery(productDescription, status)}" }, page: ${page}) {
        items {
          rawData
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
    }`;
  }

  function getMongoQuery (productDescription, status) {
    const condition = {
      $and: [
        {'rawData.product_description': {$regex: productDescription, $options: 'i'}},
        {'rawData.status': status},
      ],
    };

    return JSON.stringify(condition).replace(/"/g, '\\"');
  }
}
