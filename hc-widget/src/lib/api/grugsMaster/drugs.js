import {
  createGraphqlClient,
  stringifyQuery,
} from '../graphql/grapql-client';
import { ResponseError } from '../../exceptions';

const COLLECTION_NAME = 'drugsMaster';

export function drugInfoPredictiveSearch({ q = '' , page = 1 }) {
  const query = getQuery({ page, mongoQuery: getMongoQueryForMatch(q) });

  return fetchByQuery(query);
}

export function drugInfoById(id) {
  const query = getQuery({
    mongoQuery: stringifyQuery({ _id: id }),
  });

  return fetchByQuery(query);
}

function getQuery({page = 1, mongoQuery}) {
  return `{
      ${COLLECTION_NAME}(filter: {
        mongoQuery: "${mongoQuery}" },
        page: ${page},
        sort: "{ name: 1 }",
        perPage: 100
      ) {
        pageInfo {
          hasNextPage
        }
        items {
          _id
          packageNdc11
          name
          rxCuis {
            rxCui
          }
        }
      }
    }`;
}


function fetchByQuery(query) {
  const client = createGraphqlClient();

  return client.request(query)
    .then(handleResponse);
}


function handleResponse(res) {
  const success = !res.errors;
  if (!success) {
    console.log(res.errors);
    throw new ResponseError(`Error occurred while searching drug info.`);
  }

  const { items, pageInfo } = res[COLLECTION_NAME];

  return {
    list: items,
    hasNextPage: pageInfo.hasNextPage,
  };
}

function getMongoQueryForMatch(match) {
  const regex = { $regex: `^${match}`, $options: 'i' };
  const condition = { $or: [{ name: regex }] };
  const isPossibleNDC11 = match.split('').every(c => /[\d-]/.test(c));
  isPossibleNDC11 && condition.$or.push({ packageNdc11: regex });

  return stringifyQuery(condition);
}
