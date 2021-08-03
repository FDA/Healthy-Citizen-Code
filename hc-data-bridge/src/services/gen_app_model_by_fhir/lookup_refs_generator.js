const _ = require('lodash');
const fs = require('fs');
// const path = require('path');

const profileResourcesPath = '../../fhir_resources/profiles-resources.json';
// const refsOutputPath = '../../services/gen_app_model_by_fhir/generated/lookup_refs.json';
// const phiSchemeFlagOutputPath = '../../services/gen_app_model_by_fhir/generated/phi_scheme_flags.json';

const getRefs = () => {
  const pathToRefs = {};
  const json = JSON.parse(fs.readFileSync(profileResourcesPath));
  const entries = json.entry;
  _.forEach(entries, (entry) => {
    // if (entry.fullUrl.indexOf("/StructureDefinition/") == -1) {
    //   return;
    // }
    const elements = _.get(entry, 'resource.snapshot.element');
    _.forEach(elements, (element) => {
      const currentPath = element.path;
      const types = _.get(element, 'type');
      let isElementReference = false;
      _.forEach(types, (type) => {
        if (type.code === 'Reference') {
          isElementReference = true;
          // write cardinality
          const minValue = String(_.get(element, 'min'));
          const maxValue = String(_.get(element, 'max'));
          _.set(pathToRefs, [currentPath, 'min'], minValue);
          _.set(pathToRefs, [currentPath, 'max'], maxValue);

          const refs = _.get(pathToRefs, [currentPath, 'refs'], []);
          // console.log(type);
          const targetProfile = _.get(type, 'targetProfile');
          if (!targetProfile) {
            return;
          }
          const ref = targetProfile.substring(targetProfile.lastIndexOf('/') + 1);
          refs.push(ref);
          _.set(pathToRefs, [currentPath, 'refs'], refs);
        }
      });
      // define whether phi info used in current lookup or not
      // if cardinality is 1 its possible to define 'Patient' by this resource, so this is phi information
      if (!isElementReference) {
        return;
      }
      const curRefs = _.get(pathToRefs, [currentPath, 'refs'], []);
      const curMin = _.get(pathToRefs, [currentPath, 'min'], -1);
      const curMax = _.get(pathToRefs, [currentPath, 'max'], -1);
      if (curRefs.includes('Patient') && curMax === '1') {
        _.set(pathToRefs, [currentPath, 'isPhiUsed'], true);
      } else {
        _.set(pathToRefs, [currentPath, 'isPhiUsed'], false);
      }

      // write required
      if (curMin === '1') {
        _.set(pathToRefs, [currentPath, 'required'], true);
      } else {
        _.set(pathToRefs, [currentPath, 'required'], false);
      }

      // write isMultiple
      if (curMax === '*') {
        _.set(pathToRefs, [currentPath, 'isMultiple'], true);
      } else {
        _.set(pathToRefs, [currentPath, 'isMultiple'], false);
      }
    });
  });
  // fs.writeFileSync(refsOutputPath, JSON.stringify(pathToRefs, null, 2));
  // console.log(`Refs written to ${path.resolve(refsOutputPath)}`);
  return pathToRefs;
};

const getPhiSchemesFlags = (pathToRefs) => {
  const schemeToPhiFlag = {};
  _.forEach(pathToRefs, (pathInfo, path) => {
    const schemeName = path.substring(0, path.indexOf('.'));
    schemeToPhiFlag[schemeName] = (schemeToPhiFlag[schemeName] || false) || pathInfo.isPhiUsed;
  });
  // fs.writeFileSync(phiSchemeFlagOutputPath, JSON.stringify(schemeToPhiFlag, null, 2));
  return schemeToPhiFlag;
};

module.exports = {
  getRefs,
  getPhiSchemesFlags,
};
