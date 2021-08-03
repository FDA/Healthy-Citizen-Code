const fs = require('fs');
const path = require('path');
const _ = require('lodash');

class FhirParamsParser {
  constructor () {
    this.searchParamsFile = path.resolve(__dirname, '../../fhir_resources/search-parameters.json');
    this.profilesResourcesFile = path.resolve(__dirname, '../../fhir_resources/profiles-resources.json');
  }

  parse () {
    this._getSearchParamsInfo();
    this._getProfilesResources();
    return this.profilesResources;
  }

  _getSearchParamsInfo () {
    const searchParamsBundle = JSON.parse(fs.readFileSync(this.searchParamsFile));
    const searchParamsInfo = {};
    searchParamsBundle.entry.forEach((entry) => {
      searchParamsInfo[entry.fullUrl] = entry.resource;
    });
    this.searchParamsInfo = searchParamsInfo;
  }

  _getProfilesResources () {
    const profileResourcesBundle = JSON.parse(fs.readFileSync(this.profilesResourcesFile));
    const restResources = profileResourcesBundle.entry[0].resource.rest[0].resource;

    const processedResResources = {};
    _.forEach(restResources, (resource) => {
      const searchParams = {};
      _.forEach(resource.searchParam, (searchParam) => {
        const searchParamInfo = this.searchParamsInfo[searchParam.definition];
        const briefInfo = _.pick(searchParamInfo, ['code', 'base', 'type', 'description', 'expression', 'target']);
        searchParams[searchParam.name] = { ...searchParam, info: briefInfo };
      });
      resource.searchParam = searchParams;
      processedResResources[resource.type] = resource;
    });
    this.profilesResources = processedResResources;
  }
}

// const searchParamsMapper = new FhirParamsParser();
// const profilesResources = searchParamsMapper.parse();
// fs.writeFileSync('./generated/server_resources.json', JSON.stringify(searchParamsMapper.profilesResources, null, 2));

module.exports = FhirParamsParser;
