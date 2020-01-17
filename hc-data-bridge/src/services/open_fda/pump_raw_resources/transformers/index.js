const _ = require('lodash');
const { camelCaseKeysDeep } = require('../../../util/object');
const { getDate } = require('../../../util/date');
const { getNormalizedNDCByPackageNDC } = require('../../../util/ndc');
const openfdaSections = require('./openfda_drug_sections');

// default transformer
function def(doc) {
  const camelCasedDoc = camelCaseKeysDeep(doc);
  return {
    ...camelCasedDoc,
    rawData: doc,
  };
}

function drugAsSpl(doc) {
  const camelCasedDoc = camelCaseKeysDeep(doc);
  const { packageNdc, productNdc, brandName, genericName, splSetId, splId } = camelCasedDoc.openfda || {};

  return {
    splSetId: _.get(splSetId, '0'),
    effectiveTime: getDate(camelCasedDoc.effectiveTime),
    version: +camelCasedDoc.version || undefined,
    splId: _.get(splId, '0'),
    sections: getSections(camelCasedDoc),
    products: [
      {
        name: (brandName || []).join(', '),
        productType: 'drugs',
        isKit: null,
        productNdc11: (productNdc || []).map(prodNdc => prodNdc.replace(/-/g, '')).join(', '),
        packageNdc11s: (packageNdc || [])
          .map(ndc => getNormalizedNDCByPackageNDC(ndc))
          .filter(n => n)
          .map(packageNdc11 => ({ packageNdc11 })),
        genericName: (genericName || []).join(', '),
        ingredients: _.get(camelCasedDoc, 'splProductDataElements', []).map(ingredient => ({ ingredient })),
      },
    ],
  };

  function getSections(d) {
    const commonSectionFields = {
      id: null,
      effectiveTime: getDate(d.effectiveTime),
      text: null,
      images: [],
      codeSystem: '2.16.840.1.113883.6.1',
    };
    const sections = [];

    _.each(d, (sectionVal, sectionKey) => {
      const openfdaSection = openfdaSections[sectionKey];
      if (openfdaSection) {
        sections.push({
          ...commonSectionFields,
          title: openfdaSection.title,
          code: openfdaSection.code,
          html: getHtml(sectionVal, sectionKey),
        });
      }
    });

    return sections;
  }

  function getHtml(sectionElems, sectionKey) {
    if (sectionKey.endsWith('Table')) {
      return sectionElems.join('<br>');
    }
    return sectionElems.map(text => `<p>${text}</p>`).join('<br>');
  }
}

function aeForDrug(doc) {
  const newDoc = {};
  newDoc.rawData = doc;
  // convert to number to compare versions
  newDoc.safetyReportVersion = +doc.safetyreportversion || 0;
  newDoc.safetyReportId = +doc.safetyreportid;
  newDoc.primarySourceCountry = doc.primarysourcecountry;
  newDoc.occurCountry = doc.occurcountry;
  newDoc.transmissionDate = doc.transmissiondate;
  newDoc.reportType = +doc.reporttype || undefined;
  newDoc.serious = +doc.serious || undefined;
  newDoc.seriousnessHospitalization = doc.seriousnesshospitalization === '1';
  newDoc.seriousnessOther = doc.seriousnessother === '1'; // always '1'
  newDoc.receiveDate = doc.receivedate;
  newDoc.receiptDate = getDate(doc.receiptdate);
  newDoc.fulfillExpediteCriteria = doc.fulfillexpeditecriteria === '1';
  newDoc.companyNumb = doc.companynumb;
  newDoc.duplicate = doc.duplicate === '1';
  if (doc.reportduplicate) {
    newDoc.reportDuplicate = {
      duplicateSource: doc.reportduplicate.duplicatesource,
      duplicateNumb: doc.reportduplicate.duplicatenumb,
    };
  }
  if (doc.primarysource) {
    newDoc.primarySource = {
      reporterCountry: doc.primarysource.reportercountry,
      qualification: doc.primarysource.qualification,
    };
  }
  if (doc.sender) {
    newDoc.sender = {
      senderType: doc.sender.sendertype,
      senderOrganization: doc.sender.senderorganization,
    };
  }
  if (doc.receiver) {
    newDoc.receiver = {
      receiverType: doc.receiver.receivertype,
      receiverOrganization: doc.receiver.receiverorganization,
    };
  }

  const { patient } = doc;
  newDoc.patientOnSetAge = +_.get(patient, 'patientonsetage') || undefined;
  newDoc.patientOnSetAgeUnit = _.get(patient, 'patientonsetageunit');
  newDoc.patientWeight = +_.get(patient, 'patientweight') || undefined;
  newDoc.patientSex = _.get(patient, 'patientsex');

  newDoc.reactions = _.castArray(_.get(patient, 'reaction', [])).map(r => ({
    reactionMedDraVersionPT: r.reactionmeddraversionpt,
    reactionMedDraPT: r.reactionmeddrapt,
    reactionOutcome: r.reactionoutcome,
  }));
  newDoc.drugs = _.castArray(_.get(patient, 'drug', [])).map(d => ({
    openfda: {
      rxCuis: _.get(d, 'openfda.rxcui', []).map(rxCui => ({rxCui})),
    },
    drugCharacterization: d.drugcharacterization,
    medicinalProduct: d.medicinalproduct,
    drugStructureDosageNumb: d.drugstructuredosagenumb,
    drugStructureDosageUnit: d.drugstructuredosageunit,
    drugSeparateDosageNumb: d.drugseparatedosagenumb,
    drugIntervalDosageUnitNumb: d.drugintervaldosageunitnumb,
    drugIntervalDosageDefinition: d.drugintervaldosagedefinition,
    drugDosageText: d.drugdosagetext,
    drugAdministrationRoute: d.drugadministrationroute,
    drugIndication: d.drugindication,
    drugStartDate: getDate(d.drugstartdate),
    drugEndDate: getDate(d.drugenddate),
    activeSubstances: (_.get(d, 'activesubstance.activesubstancename')
      ? d.activesubstance.activesubstancename.split('\\')
      : []
    ).map(activeSubstance => ({ activeSubstance })),
  }));
  const summary = _.get(patient, 'summary', {});
  newDoc.summary = _.isString(summary) ? summary : summary.narrativeincludeclinical;

  const ndcSet = _.reduce(
    patient.drug,
    (res, drug) => {
      _.get(drug, 'openfda.package_ndc', []).forEach(ndc => {
        res.add(ndc);
      });
      return res;
    },
    new Set()
  );
  newDoc.normalizedPackageNdcs11 = [...ndcSet].map(ndc => getNormalizedNDCByPackageNDC(ndc)).filter(n => n);

  return newDoc;
}

const PACKAGE_NDC_REGEX = /(\d{5}-\d{4}-\d{1})|(\d{4}-\d{4}-\d{2})|(\d{5}-\d{3}-\d{2})|(NDC \d{11})/g;

// More info: https://confluence.conceptant.com/pages/viewpage.action?pageId=13172808#MatchingAdverseEventstoDrugs(Andrey'sVersion)-recallsRes
function recallForDrug(doc, rxcuiData) {
  const camelCasedDoc = camelCaseKeysDeep(doc);

  const { extractedNdc11s, invalidNdcs } = getPackageNdcsFromDrugRecall(camelCasedDoc);
  const docDescription = `productDescription: '${camelCasedDoc.productDescription}', eventId: ${camelCasedDoc.eventId}`;
  if (invalidNdcs.length) {
    console.warn(`Found invalid NDC11s '${invalidNdcs.join(',')}' for ${docDescription}`);
  }
  if (!extractedNdc11s.length) {
    console.warn(`Found empty 'extractedNdc11s' for recall with ${docDescription}`);
  }
  camelCasedDoc.moreCodeInfos = (camelCasedDoc.moreCodeInfo || []).map(moreCodeInfo => ({ moreCodeInfo }));
  delete camelCasedDoc.moreCodeInfo;
  camelCasedDoc.extractedNdc11s = extractedNdc11s.map(extractedPackageNdc11 => ({ extractedPackageNdc11 }));
  camelCasedDoc.packageNdc11s = _.get(camelCasedDoc, 'openfda.packageNdc', [])
    .map(ndc => getNormalizedNDCByPackageNDC(ndc))
    .filter(n => n)
    .map(packageNdc11 => ({ packageNdc11 }));

  camelCasedDoc.reportDate = getDate(camelCasedDoc.reportDate);
  camelCasedDoc.terminationDate = getDate(camelCasedDoc.terminationDate);
  camelCasedDoc.recallInitiationDate = getDate(camelCasedDoc.recallInitiationDate);
  camelCasedDoc.centerClassificationDate = getDate(camelCasedDoc.centerClassificationDate);

  const rxCuis = _.get(camelCasedDoc, 'openfda.rxcui', []);
  camelCasedDoc.rxCuis = _(rxCuis)
    .map(rxCui => _.get(rxcuiData, `${rxCui}.rxCuis`))
    .filter(rxcui => rxcui)
    .flatten()
    .value();
  camelCasedDoc.stateProvince = camelCasedDoc.state;

  camelCasedDoc.productType = camelCasedDoc.productType.toLowerCase();

  delete camelCasedDoc.openfda;
  delete camelCasedDoc.state;

  return {
    ...camelCasedDoc,
    rawData: doc,
  };

  function getPackageNdcsFromDrugRecall(drugRecall) {
    const productDescription = drugRecall.productDescription || '';

    const match = productDescription.match(PACKAGE_NDC_REGEX) || [];
    const extractedNdc11s = _.uniq(match).map(ndc => {
      const clearedNdc = ndc.startsWith('NDC ') ? ndc.substr(4) : ndc;
      return getNormalizedNDCByPackageNDC(clearedNdc);
    });
    const invalidNdcs = extractedNdc11s.reduce((res, val, key) => {
      if (val === null) {
        res.push(match[key]);
      }
      return res;
    }, []);
    return { extractedNdc11s: extractedNdc11s.filter(n => n), invalidNdcs };
  }
}

// used for first stage - pumping recall data, see 'open_fda/pump_device_recall_with_enforcements/pump_device_recall_with_enforcements.js'
function pumpDeviceRecallWithEnforcements(doc) {
  const camelCasedDoc = camelCaseKeysDeep(doc);
  return {
    ...camelCasedDoc,
    rawDataRecall: doc,
  };
}

module.exports = {
  def,
  drugAsSpl,
  aeForDrug,
  recallForDrug,
  pumpDeviceRecallWithEnforcements,
};
