const uuidv4 = require('uuid/v4');
const { getToken,
  gql: {
    gqlCreateRecord
  } } = require('../../../utils');

module.exports = {
  lookupLabelFixture,
  lookupLabelWithFormDataFixture,
};

async function lookupLabelFixture(page) {
  const labelText = uuidv4();
  const data = { string: labelText };
  const token = await getToken(page);
  await gqlCreateRecord(token, 'basicTypes', data);

  return data.string;
}

async function lookupLabelWithFormDataFixture(page) {
  const labelText = uuidv4();
  const data = { name: labelText };
  const token = await getToken(page);
  await gqlCreateRecord(token, 'lookupWithDataAttachment', data);

  return data.name;
}
