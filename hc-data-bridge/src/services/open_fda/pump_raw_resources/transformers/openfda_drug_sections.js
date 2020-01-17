const _ = require('lodash');

const loincSection = {
  'ABUSE SECTION': { code: '34086-9' },
  ACCESSORIES: { code: '60555-0' },
  'ADVERSE REACTIONS SECTION': { code: '34084-4' },
  ALARMS: { code: '69761-5' },
  'ANIMAL PHARMACOLOGY & OR TOXICOLOGY SECTION': { code: '34091-9' },
  'ASSEMBLY OR INSTALLATION INSTRUCTIONS': { code: '60556-8' },
  'BOXED WARNING SECTION': { code: '34066-1' },
  'CALIBRATION INSTRUCTIONS': { code: '60557-6' },
  'CARCINOGENESIS & MUTAGENESIS & IMPAIRMENT OF FERTILITY SECTION': { code: '34083-6' },
  'CLINICAL PHARMACOLOGY SECTION': { code: '34090-1' },
  'CLEANING, DISINFECTING, AND STERILIZATION INSTRUCTIONS': { code: '60558-4' },
  'CLINICAL STUDIES SECTION': { code: '34092-7' },
  'COMPATIBLE ACCESSORIES': { code: '69760-7' },
  COMPONENTS: { code: '60559-2' },
  'CONTRAINDICATIONS SECTION': { code: '34070-3' },
  'CONTROLLED SUBSTANCE SECTION': { code: '34085-1' },
  'DEPENDENCE SECTION': { code: '34087-7' },
  'DESCRIPTION SECTION': { code: '34089-3' },
  'DIAGRAM OF DEVICE': { code: '69758-1' },
  'DISPOSAL AND WASTE HANDLING': { code: '69763-1' },
  'DOSAGE & ADMINISTRATION SECTION': { code: '34068-7' },
  'DOSAGE FORMS & STRENGTHS SECTION': { code: '43678-2' },
  'DRUG & OR LABORATORY TEST INTERACTIONS SECTION': { code: '34074-5' },
  'DRUG ABUSE AND DEPENDENCE SECTION': { code: '42227-9' },
  'DRUG INTERACTIONS SECTION': { code: '34073-7' },
  'ENVIRONMENTAL WARNING SECTION': { code: '50742-6' },
  'FEMALES & MALES OF REPRODUCTIVE POTENTIAL SECTION': { code: '77291-3' },
  'FOOD SAFETY WARNING SECTION': { code: '50743-4' },
  'GENERAL PRECAUTIONS SECTION': { code: '34072-9' },
  'GERIATRIC USE SECTION': { code: '34082-8' },
  'GUARANTEED ANALYSIS OF FEED SECTION': { code: '50740-0' },
  'HEALTH CARE PROVIDER LETTER SECTION': { code: '71744-7' },
  'HEALTH CLAIM SECTION': { code: '69719-3' },
  'HEPATIC IMPAIRMENT SUBSECTION': { code: '88829-7' },
  'HOW SUPPLIED SECTION': { code: '34069-5' },
  IMMUNOGENICITY: { code: '88830-5' },
  'INACTIVE INGREDIENT SECTION': { code: '51727-6' },
  'INDICATIONS & USAGE SECTION': { code: '34067-9' },
  'INFORMATION FOR OWNERS/CAREGIVERS SECTION': { code: '50744-2' },
  'INFORMATION FOR PATIENTS SECTION': { code: '34076-0' },
  'INSTRUCTIONS FOR USE SECTION': { code: '59845-8' },
  'INTENDED USE OF THE DEVICE': { code: '60560-0' },
  'LABOR & DELIVERY SECTION': { code: '34079-4' },
  'LABORATORY TESTS SECTION': { code: '34075-2' },
  'LACTATION SECTION': { code: '77290-5' },
  'MECHANISM OF ACTION SECTION': { code: '43679-0' },
  'MICROBIOLOGY SECTION': { code: '49489-8' },
  'NONCLINICAL TOXICOLOGY SECTION': { code: '43680-8' },
  'NONTERATOGENIC EFFECTS SECTION': { code: '34078-6' },
  'NURSING MOTHERS SECTION': { code: '34080-2' },
  'OTHER SAFETY INFORMATION': { code: '60561-8' },
  'OVERDOSAGE SECTION': { code: '34088-5' },
  'OTC - ACTIVE INGREDIENT SECTION': { code: '55106-9' },
  'OTC - ASK DOCTOR SECTION': { code: '50569-3' },
  'OTC - ASK DOCTOR/PHARMACIST SECTION': { code: '50568-5' },
  'OTC - DO NOT USE SECTION': { code: '50570-1' },
  'OTC - KEEP OUT OF REACH OF CHILDREN SECTION': { code: '50565-1' },
  'OTC - PREGNANCY OR BREAST FEEDING SECTION': { code: '53414-9' },
  'OTC - PURPOSE SECTION': { code: '55105-1' },
  'OTC - QUESTIONS SECTION': { code: '53413-1' },
  'OTC - STOP USE SECTION': { code: '50566-9' },
  'OTC - WHEN USING SECTION': { code: '50567-7' },
  'PACKAGE LABEL.PRINCIPAL DISPLAY PANEL': { code: '51945-4' },
  'PATIENT COUNSELING INFORMATION': { code: '88436-1' },
  'PATIENT MEDICATION INFORMATION SECTION': { code: '68498-5' },
  'PEDIATRIC USE SECTION': { code: '34081-0' },
  'PHARMACODYNAMICS SECTION': { code: '43681-6' },
  'PHARMACOGENOMICS SECTION': { code: '66106-6' },
  'PHARMACOKINETICS SECTION': { code: '43682-4' },
  'PRECAUTIONS SECTION': { code: '42232-9' },
  'PREGNANCY SECTION': { code: '42228-7' },
  'RECENT MAJOR CHANGES SECTION': { code: '43683-2' },
  'REFERENCES SECTION': { code: '34093-5' },
  'RESIDUE WARNING SECTION': { code: '53412-3' },
  'REMS ADMINISTRATIVE INFORMATION': { code: '87523-7' },
  'REMS APPLICANT REQUIREMENTS': { code: '87526-0' },
  'REMS COMMUNICATION': { code: '82344-3' },
  'REMS ELEMENTS': { code: '82348-4' },
  'REMS ELEMENTS TO ASSURE SAFE USE': { code: '82345-0' },
  'REMS GOALS': { code: '82349-2' },
  'REMS IMPLEMENTATION SYSTEM': { code: '82350-0' },
  'REMS MATERIAL': { code: '82346-8' },
  'REMS MEDICATION GUIDE': { code: '82598-4' },
  'REMS PARTICIPANT REQUIREMENTS': { code: '87525-2' },
  'REMS REQUIREMENTS': { code: '87524-5' },
  'REMS SUMMARY': { code: '82347-6' },
  'REMS TIMETABLE FOR SUBMISSION ASSESSMENTS': { code: '82352-6' },
  'RENAL IMPAIRMENT SUBSECTION': { code: '88828-9' },
  RISKS: { code: '69759-9' },
  'ROUTE, METHOD AND FREQUENCY OF ADMINISTRATION': { code: '60562-6' },
  'SAFE HANDLING WARNING SECTION': { code: '50741-8' },
  'SPL INDEXING DATA ELEMENTS SECTION': { code: '48779-3' },
  'SPL PRODUCT DATA ELEMENTS SECTION': { code: '48780-1' },
  'SPL MEDGUIDE SECTION': { code: '42231-1' },
  'SPL PATIENT PACKAGE INSERT SECTION': { code: '42230-3' },
  'SPL UNCLASSIFIED SECTION': { code: '42229-5' },
  'STATEMENT OF IDENTITY SECTION': { code: '69718-5' },
  'STORAGE AND HANDLING SECTION': { code: '44425-7' },
  'SUMMARY OF SAFETY AND EFFECTIVENESS': { code: '60563-4' },
  'TERATOGENIC EFFECTS SECTION': { code: '34077-8' },
  TROUBLESHOOTING: { code: '69762-3' },
  'USE IN SPECIFIC POPULATIONS SECTION': { code: '43684-0' },
  'USER SAFETY WARNINGS SECTION': { code: '54433-8' },
  'VETERINARY INDICATIONS SECTION': { code: '50745-9' },
  'WARNINGS AND PRECAUTIONS SECTION': { code: '43685-7' },
  'WARNINGS SECTION': { code: '34071-1' },
};

/**
 * Openfda source file for spl_to_json - https://github.com/FDA/openfda/blob/c1049ed791770e81e8fa370c68495291016a0a74/openfda/spl/spl_to_json.js
 * Some of keys are extracted with '_table' ending.
 */
const openfdaSections = _.reduce(
  loincSection,
  (res, val, key) => {
    const title = key
      .replace(' SECTION', '')
      .replace(/ & /g, ' AND ')
      .replace(/\//g, ' OR ');
    const clearedTitle = title.replace('OTC - ', '');
    const openfdaField = _.camelCase(clearedTitle);
    const openfdaFieldWithTable = `${openfdaField}Table`;

    const value = { code: val.code, title };
    res[openfdaField] = value;
    res[openfdaFieldWithTable] = value;
    return res;
  },
  {}
);

module.exports = openfdaSections;
