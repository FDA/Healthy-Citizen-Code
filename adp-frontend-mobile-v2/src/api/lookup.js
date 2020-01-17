import Client from './HTTPClient';

const LookupAPI = {
  findQuery(lookupId, query, page = 1) {
    return Client.get(`/lookups/${lookupId}?q=${query}&page=${page}`, null, true);
  }
};

export default LookupAPI;
