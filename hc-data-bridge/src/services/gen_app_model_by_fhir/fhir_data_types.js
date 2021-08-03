// here datatypes should be implemented https://www.hl7.org/fhir/datatypes.html
const _ = require('lodash');

/*
function getMetaFields () {
  return {
    versionId: {
      type: 'String',
      fullName: 'Id',
      description: 'Logical id of this artifact',
    },
    lastUpdated: {
      type: 'Mixed',
      fullName: 'value',
      description: 'Value of extension',
    },
    profile: {

    },
    security: {

    },
    tag: {

    }
  };
}
*/

function getExtensionFields () {
  return {
    url: {
      type: 'String',
      fullName: 'url',
      description: 'Source of the definition for the extension code - a logical name or a URL.',
      visible: false,
    },
    'value[x]': { // actually there are a lot of fields starting with 'value'
      type: 'Mixed',
      fullName: 'value',
      description: 'Value of extension',
      visible: false,
    },
  };
}

function getResourceFields () {
  return {
    id: {
      type: 'String',
      fullName: 'Id',
      description: 'Logical id of this artifact',
      required: true,
      unique: true,
    },
    meta: {
      type: 'Mixed',
      fullName: 'Meta',
      description: 'Metadata about the resource',
      visible: false,
    },
    implicitRules: {
      type: 'String',
      fullName: 'Implicit Rules',
      description: 'A set of rules under which this content was created',
      visible: false,
    },
    language: {
      type: 'String',
      fullName: 'Language',
      description: 'Language of the resource content',
      visible: false,
    },
  };
}

function getDomainResourceFields () {
  const extendedFields = getResourceFields();
  const baseFields = {
    text: {
      type: 'Mixed',
      fullName: 'Text',
      description: 'Text summary of the resource, for human interpretation',
      visible: false,
    },
    contained: {
      type: 'Mixed[]',
      fullName: 'Contained',
      description: 'Contained, inline Resources',
      visible: false,
    },
    implicitRules: {
      type: 'String',
      fullName: 'Implicit Rules',
      description: 'A set of rules under which this content was created',
      visible: false,
    },
    language: {
      type: 'String',
      fullName: 'Language',
      description: 'Language of the resource content',
      visible: false,
    },
  };
  return _.merge(baseFields, extendedFields);
}

function getReferenceFields () {
  return {
    reference: {
      type: 'String',
      fullName: 'reference',
      description: 'A reference to a location at which the other resource is found. The reference may be a relative reference, in which case it is relative to the service base URL, or an absolute URL that resolves to the location where the resource is found. The reference may be version specific or not. If the reference is not to a FHIR RESTful server, then it should be assumed to be version specific. Internal fragment references (start with \u0027#\u0027) refer to contained resources.',
      // visible: false,
    },
    _reference: {
      type: 'Mixed', // actual type is Element (avoid recursive call)
      fullName: '_reference',
      description: 'Extensions for _reference',
      visible: false,
    },
    identifier: {
      type: 'Mixed', // actual type is Identifier (avoid recursive call)
      fullName: '_identifier',
      description: 'An identifier for the other resource. This is used when there is no way to reference the other resource directly, either because the entity is not available through a FHIR server, or because there is no way for the author of the resource to convert a known identifier to an actual location. There is no requirement that a Reference.identifier point to something that is actually exposed as a FHIR instance, but it SHALL point to a business concept that would be expected to be exposed as a FHIR instance, and that instance would need to be of a FHIR resource type allowed by the reference.',
      visible: false,
    },
    display: {
      type: 'String',
      fullName: 'display',
      description: 'Plain text narrative that identifies the resource in addition to the resource reference.',
      // visible: false,
    },
    _display: {
      type: 'Mixed', // actual type is Element (avoid recursive call)
      fullName: '_display',
      description: 'Extensions for display',
      visible: false,
    },
  };
}

module.exports = {
  // getMetaFields,
  getResourceFields,
  getExtensionFields,
  getDomainResourceFields,
  getReferenceFields,
};
