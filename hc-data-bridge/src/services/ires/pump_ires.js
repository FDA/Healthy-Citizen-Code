const args = require('optimist').argv;
const Promise = require('bluebird');
const axios = require('axios');
// const rp = require('request-promise');
const querystring = require('querystring');

const { mongoConnect, insertOrReplaceDocByCondition } = require('../util/mongo');

const RECALLS_ENDPOINT = 'https://www.accessdata.fda.gov/rest/iresapi/recalls';
const BATCH_SIZE = 2500;
const { mongoUrl, user, key, eventlmdfrom } = args;
const resCollectionName = args.resCollectionName || 'recallsRes';

async function getRecalls({ start, size, auth, eventLmdFrom = '01/01/1990' }) {
  const now = new Date();
  const eventLmdTo = `${now.getUTCMonth() + 1}/${now.getUTCDate()}/${now.getUTCFullYear() + 1}`;
  const formData = {
    displaycolumns:
      'recalleventid,firmcitynam,firmcountrynam,firmline1adr,firmline2adr,firmpostalcd,firmphonenum,firmstatecd,phasetxt,recallinitiationdt,firmfeinum,firmsurvivingfei,firmlegalnam,firmsurvivingnam,voluntarytypetxt,distributionareasummarytxt,centercd,centerclassificationdt,productid,productdescriptiontxt,producttypeshort,productshortreasontxt,recallnum,productdistributedquantity,centerclassificationtypetxt,eventlmd,codeinformation,initialfirmnotificationtxt,reportdt,terminationdt,determinationdt',
    filter: `[{'eventlmdfrom': '${eventLmdFrom}'}, {'eventlmdto':'${eventLmdTo}'}]`,
    start,
    rows: size,
    sort: 'productid',
    sortorder: 'asc',
  };

  // 1. (Failed)
  // Send data: `payLoad=${querystring.stringify(formData)}`,

  // 2. (Testing)
  // Send data: `payLoad=${JSON.stringify(formData)}`

  // 3.
  // Send data: `payLoad=${encodeURIComponent(JSON.stringify(formData))}`

  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  if (auth.user && auth.key) {
    headers['Authorization-User'] = auth.user;
    headers['Authorization-Key'] = auth.key;
  }

  const signature = (+new Date()).toString(36);
  const options = {
    method: 'POST',
    url: RECALLS_ENDPOINT,
    data: `payLoad=${JSON.stringify(formData)}`,
    params: { signature },
    headers,
  };
  console.log(`Requesting with options:\n ${JSON.stringify(options, null, 2)}`);
  return axios(options);

  // const res = await rp
  //   .post({
  //     url: `${RECALLS_ENDPOINT}?signature=${signature}`,
  //     method: 'POST',
  //     headers,
  //   })
  //   .form({ payLoad: formData });
  // return res;
}

function getDateField(dateField) {
  return dateField ? new Date(dateField) : undefined;
}

function transformIresDoc(doc) {
  return {
    eventId: doc.RECALLEVENTID,
    productId: doc.PRODUCTID,
    productType: doc.PRODUCTTYPESHORT,
    postalCode: doc.FIRMPOSTALCD,
    stateProvince: doc.FIRMSTATECD,
    country: doc.FIRMCOUNTRYNAM,
    city: doc.FIRMCITYNAM,
    recallingFirm: doc.FIRMLEGALNAM,
    distributionPattern: doc.DISTRIBUTIONAREASUMMARYTXT,
    recallNumber: doc.RECALLNUM,
    productDescription: doc.PRODUCTDESCRIPTIONTXT,
    productQuantity: doc.PRODUCTDISTRIBUTEDQUANTITY,
    reasonForRecall: doc.PRODUCTSHORTREASONTXT,
    recallInitiationDate: getDateField(doc.RECALLINITIATIONDT),
    reportDate: getDateField(doc.REPORTDT),
    terminationDate: getDateField(doc.TERMINATIONDT),
    determinationDate: getDateField(doc.DETERMINATIONDT),
    centerClassificationDate: getDateField(doc.CENTERCLASSIFICATIONDT),
    codeInfo: doc.CODEINFORMATION,
    status: doc.PHASETXT,
    voluntaryMandated: `Voluntary: ${doc.VOLUNTARYTYPETXT}`,
    initialFirmNotificationOfConsigneeOrPublic: doc.INITIALFIRMNOTIFICATIONTXT,
    address1: doc.FIRMLINE1ADR,
    address2: doc.FIRMLINE2ADR,
    classification: doc.CENTERCLASSIFICATIONTYPETXT
      ? `Class ${'I'.repeat(+doc.CENTERCLASSIFICATIONTYPETXT)}`
      : undefined,
    eventLastModifiedDate: doc.EVENTLMD,
    resRecordId: doc.RID,
    firmPhoneNumber: doc.FIRMPHONENUM,
    centerCode: doc.CENTERCD,
    firmFeiNumber: doc.FIRMFEINUM,
    firmSurvivingNumber: doc.FIRMSURVIVINGFEI,
    firmSurvivingName: doc.FIRMSURVIVINGNAM,
  };
}

function upsertRecall(dbCon, doc) {
  if (doc.productId && doc.eventId) {
    return insertOrReplaceDocByCondition(doc, dbCon.collection(resCollectionName), { productId: doc.productId, eventId: doc.eventId });
  }
  console.warn(`Both productId and eventId should be defined in doc`, JSON.stringify(doc, null, 2));
}

async function pumpIresRecalls(dbCon) {
  let start = 1;
  let docsCount = Infinity;
  console.log(`Start retrieving recalls with batch size = ${BATCH_SIZE}`);
  while (start < docsCount) {
    const { data } = await getRecalls({ start, size: BATCH_SIZE, auth: { user, key }, eventLmdFrom: eventlmdfrom });
    const { MESSAGE, RESULTCOUNT, STATUSCODE, RESULT } = data;
    if (STATUSCODE !== 400) {
      throw new Error(`Error response from iRes: code=${STATUSCODE}, message: '${MESSAGE}'`);
    }
    docsCount = RESULTCOUNT;
    console.log(`Retrieved data, ${start + RESULT.length - 1}/${docsCount}. Transforming and upserting recalls...`);
    start += BATCH_SIZE;
    await Promise.map(RESULT, iresDoc => {
      const recallDoc = transformIresDoc(iresDoc);
      return upsertRecall(dbCon, recallDoc);
    });
  }
}

async function createIndexes(dbCon) {
  try {
    await dbCon.collection(resCollectionName).createIndex({ recallNumber: 1 });
  } catch (e) {
    // it can be created with unique: true
  }
}

(async () => {
  try {
    const dbCon = await mongoConnect(mongoUrl);
    await createIndexes(dbCon);
    console.log(`Pumping iRES data...\n`);

    await pumpIresRecalls(dbCon);
    console.log('\nDone pumping iRES data');
    process.exit(0);
  } catch (e) {
    console.error('Error occurred while pumping iRES data.', e.stack);
    process.exit(1);
  }
})();
