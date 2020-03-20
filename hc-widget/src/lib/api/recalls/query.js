export function createRecallQuery(collectionName) {
  return `query q($mongoQuery: String) {
    ${collectionName} (
      filter: {
        mongoQuery: $mongoQuery
      }
    ) {
      pageInfo { itemCount }
      items {
        recallInitiationDate
        status
        classification
        recallingFirm
        distributionPattern
        reasonForRecall
        codeInfo
        productDescription
        rxCuis { rxCui }
      }
    }
  }`;
}
