const glob = require('glob');
const fs = require('fs');
const _ = require('lodash');

/**
 * Stores HC app model for FHIR refs.
 * App model can be received by key. Key format is: <schemeName>.<path>.
 * Examples:
 * 1) Address.definitions.Address (DomainResource, should be separate collection)
 * 2) Encounter.definitions.Encounter_StatusHistory (BackboneElement, should not be separate collection because its used inside DomainResource only)
 */
class RefsGraphGenerator {
  constructor () {
    this.schemeDir = '../../fhir_resources/fhir.schema';
    this.refGraph = {};
    this.refPath = '';
  }

  getSchemePathDefinitionPath (ref, currentSchemePath) {
    const { schemePath, path } = this.getSchemePathAndPathByRef(ref);
    let filename;
    if (!schemePath) {
      filename = currentSchemePath.substring(currentSchemePath.lastIndexOf('/') + 1);
    } else {
      filename = schemePath;
    }
    const schemeFilePath = `${this.schemeDir}/${filename}`;
    const definitionPath = path.replace('definitions.', '');
    return { schemeFilePath, definitionPath };
  }

  getSchemePathAndPathByRef (ref) {
    let [schemePath, path] = ref.split('#');
    path = path.substring(1).replace('/', '.'); // '/definitions/CodeableConcept' -> 'definitions.CodeableConcept'
    return { schemePath, path };
  }

  // Get Scheme for specified scheme file and definition path.
  // For example in Patient scheme file there are Patient, Patient_Contact and other objects.
  // If definitionPath is not defined it will be parsed from schemeFilePath
  parseSchemeFile (schemePath) {
    const schemeJson = JSON.parse(fs.readFileSync(schemePath));

    const definitions = schemeJson.definitions;
    _.forEach(definitions, (definition, schemeName) => {
      this.refPath = schemeName;
      const allOf = _.get(definition, 'allOf');
      const refType = _.get(allOf, '[0].$ref');

      if (!allOf) {
        console.log(`No allof for ${schemeName}`);
        return;
      }
      const fhirModel = _.get(definition, `allOf[${allOf.length - 1}]`);
      for (const key in fhirModel.properties) {
        const fhirElem = fhirModel.properties[key];
        const ref = fhirElem.$ref || _.get(fhirElem, 'items.$ref');
        if (ref) {
          const { schemeFilePath, definitionPath } = this.getSchemePathDefinitionPath(ref, schemePath);
          // add to current refPath, change refGraph
          const curObj = _.get(this.refGraph, this.refPath, []);
          if (!curObj.includes(definitionPath)) {
            curObj.push(definitionPath);
          }
          _.set(this.refGraph, this.refPath, curObj);
        }
      }
    });
  }

  getSchemes () {
    const schemePaths = glob.sync(`${this.schemeDir}/**/*.json`);
    _.forEach(schemePaths, (schemePath) => {
      this.parseSchemeFile(schemePath);
    });
    return this.refGraph;
  }

  writeRefsGraph (path) {
    if (this.refGraph) {
      this.getSchemes();
    }
    fs.writeFileSync(path, JSON.stringify(this.refGraph, null, 2));
  }
}

// const refsGraphGenerator = new RefsGraphGenerator();
// refsGraphGenerator.getSchemes();
// const refsGraphPathToWrite = './generated/refs_graph.json';
// refsGraphGenerator.writeRefsGraph(refsGraphPathToWrite);
// process.exit(0);

module.exports = RefsGraphGenerator;
