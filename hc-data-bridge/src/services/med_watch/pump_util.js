const Promise = require('bluebird');
const $ = require('cheerio');
const urlParse = require('url-parse');

const { trimSpaceChars } = require('../util/string');
const { insertOrReplaceDocByCondition } = require('../util/mongo');
const { getAxiosProxySettings } = require('../util/proxy');
// eslint-disable-next-line import/order
const axios = require('axios').create(getAxiosProxySettings());

async function parseSafetyAlertsPage(pageUrl, dbCon, collectionName) {
  try {
    const { data: html } = await axios.get(pageUrl);
    const alertHeader = $(`article > header > h1`, html).text();
    console.log(`Handling ${alertHeader}`);

    const safetyAlertsLinks = [];
    // const productHeaders = $(`article h2`, html).contents().map((i, elem) => elem.data);

    // gets host with protocol
    const { origin } = urlParse(pageUrl);

    // handle product tables
    $(`article table tbody`, html).each((tbodyIx, tbodyElem) => {
      // const productHeader = productHeaders[tbodyIx];

      const trs = $(tbodyElem).children();
      trs.each((trIx, trElem) => {
        const children = $(trElem).children();
        const prodNameTd = children.get(0);
        const singleAlertPageUrl = origin + $(`a`, $(prodNameTd)).get(0).attribs.href;

        // const dateTd = children.get(1);
        // const productName = $(`linktitle`, $(prodNameTd)).text();
        // const dateYYYYMMDD = $(dateTd).get(0).attribs['data-value'];
        // const doc = {productHeader, productName, date: dateYYYYMMDD, singleAlertPageUrl};
        safetyAlertsLinks.push(singleAlertPageUrl);
      });
    });

    await Promise.map(safetyAlertsLinks, async alertLink => {
      try {
        const alert = await parseSingleAlertPage(alertLink);
        alert.docSource = 'Alert Page';

        await upsertSafetyAlert(alert, dbCon, collectionName);
        console.log(`Saved alert '${alert.productName}' by url ${alertLink}`);
      } catch (e) {
        console.log(`Cannot parse single alert page ${alertLink}. Alert will be skipped.`, e.stack);
      }
    });
  } catch (e) {
    console.error(`Cannot handle safety alert page '${pageUrl}'`, e.stack);
  }
}

/*
function replaceSubmitMessageFromArticle(article) {
  // middle of message may vary - 'these products'/'this product' - but the beginning and the ending are the same
  const beginning = 'Healthcare professionals and patients are encouraged';
  const start = article.indexOf(beginning);
  const ending = 'submit by fax to 1-800-FDA-0178';
  const end = article.indexOf(ending) + ending.length;
  if (start !== -1 && end > ending.length) {
    return article.slice(0, start) + article.slice(end, article.length);
  }
  return article;
}
*/

async function parseSingleAlertPage(pageUrl) {
  const { data: html } = await axios.get(pageUrl);
  const productName = trimSpaceChars($(`article > header > h1`, html).text());
  const articleText = trimSpaceChars($(`article`, html).text());
  try {
    const [, audience, issue, background, recommendation, posted] = articleText.match(
      /AUDIENCE:(.*)ISSUES?:(.*)BACKGROUND:(.*)RECOMMENDATIONS?:(.*)(\[(\d\d\/)?\d\d\/\d\d\d\d -.*])/
    );
    return {
      productName,
      audience: trimSpaceChars(audience),
      issue: trimSpaceChars(issue),
      background: trimSpaceChars(background),
      recommendation: trimSpaceChars(recommendation),
      posted: trimSpaceChars(posted),
    };
  } catch (e) {
    console.error(`Unable to parse text: ${articleText}`);
    throw e;
  }
}

function upsertSafetyAlert(doc, dbCon, collectionName) {
  return insertOrReplaceDocByCondition(doc, dbCon.collection(collectionName), { productName: doc.productName });
}

function handleSafetyAlertsPages(pageUrls, dbCon, collectionName) {
  return Promise.map(pageUrls, pageUrl => parseSafetyAlertsPage(pageUrl, dbCon, collectionName));
}

module.exports = {
  handleSafetyAlertsPages,
  parseSingleAlertPage,
  upsertSafetyAlert,
};
