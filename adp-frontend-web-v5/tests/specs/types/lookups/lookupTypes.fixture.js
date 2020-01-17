const uuidv4 = require('uuid/v4');
const { createRecord } = require('../../../utils/api-helpers');

module.exports = async function lookupLabelFixture(page) {
  const labelText = uuidv4();
  const data = { string: labelText };
  await createRecord(data, 'basicTypes', page);

  return data.string;
};
