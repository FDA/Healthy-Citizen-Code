import { get } from '../../utils/utils';
import { SUPPORTED_CODING_SYSTEMS } from '../../../constants';

/**
 * @typedef Coding
 * @type {Object}
 *
 * @property {String} code
 * @property {String} system
 * @property {String} display
 */

/**
 * @param res {Object} - response from FHIR server
 * @param options{Object} - widget options
 * @return {Coding[]} codings - list of coding objects
 */
export function extractRxCuiFromMedicationRequest(res, { dataSource }) {
  return extractCoding({
    entries: res.entry,
    codingSystem: SUPPORTED_CODING_SYSTEMS.RXCUI,
    codingPath: getCodePath(dataSource),
  });
}

/**
 *
 * @param {Object[]} entries - entries from fhir response to search in
 * @param {String[]} codingSystem
 * @param {String} codingPath
 *
 * @return {Coding[]} codings - list of coding objects
 */
function extractCoding({ entries, codingSystem, codingPath }) {
  const result = {};

  entries.forEach((entry) => {
    const codings = get(entry, codingPath, []);

    codings.forEach((coding) => {
      console.log(coding.system);
      const matches = coding.system === codingSystem;
      if (!matches) {
        return;
      }

      result[coding.code] = coding;
    });
  });

  console.log(result);
  return Object.values(result);
}

/**
 * @param res {Object} - response from FHIR server
 * @param options{Object} - widget options
 * @return {Coding[]} codings - list of coding objects
 */
export function extractCodingsWithNdcFromMedicationStatement(res, { dataSource }) {
  return extractCodingByResource({
    entries: res.entry,
    codingSystem: SUPPORTED_CODING_SYSTEMS.NDC,
    codingPath: getCodePath(dataSource),
    resourceType: 'MedicationStatement',
  });
}

function extractCodingByResource({ entries, codingSystem, codingPath, resourceType }) {
  const entriesByResource = entries.filter((entry) => {
    const actualResourceType = get(entry, 'resource.resourceType', '');
    return actualResourceType === resourceType;
  });

  return extractCoding({
    entries: entriesByResource,
    codingSystem,
    codingPath,
  });
}
function getCodePath(dataSource) {
  const resourcePaths = {
    stu3: 'resource.medicationCodeableConcept.coding',
    dstu2: 'resource.medicationCodeableConcept.coding',
    epicStu3: 'resource.code.coding',
    epicStu3WithOauth2: 'resource.code.coding',
  };

  return resourcePaths[dataSource];
}
