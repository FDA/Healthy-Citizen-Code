async function* scrollSearch(client, params) {
  let response = await client.search(params);

  while (true) {
    const sourceHits = response.body.hits.hits;

    if (sourceHits.length === 0) {
      await client.clearScroll({
        scrollId: response.body._scroll_id,
      });
      break;
    }

    for (const hit of sourceHits) {
      yield hit;
    }

    if (!response.body._scroll_id) {
      break;
    }

    response = await client.scroll({
      scrollId: response.body._scroll_id,
      scroll: params.scroll,
    });
  }
}

module.exports = {
  scrollSearch,
};
