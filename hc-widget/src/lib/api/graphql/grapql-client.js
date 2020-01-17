import CONFIG from '../../../config';
import { GraphQLClient } from 'graphql-request';

export function createGraphqlClient(endpoint = `${CONFIG.HA_URL}/graphql`) {
  const headers = {'Content-Type': 'application/json'};

  return new GraphQLClient(endpoint, { headers });
}

export function stringifyQuery(query) {
  return JSON.stringify(query).replace(/"/g, '\\"');
}
