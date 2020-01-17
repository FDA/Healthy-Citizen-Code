import { ResponseError } from '../../exceptions';

export function handleResponse(data, collectionName) {
  const { items, pageInfo } = data[collectionName];

  if (!items.length) {
    throw new ResponseError(ResponseError.RESPONSE_EMPTY);
  }

  return { list: items, itemCount: pageInfo.itemCount };
}

export function handleError(err) {
  if (err instanceof ResponseError) {
    return {
      list: [],
      itemCount: 0,
    }
  }

  console.log(err);
  throw err;
}
