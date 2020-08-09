const DEFAULT_LANGUAGE_CODE = "en-US";

/*
    Official documentation fhir http://hl7.org/fhir/2016May/resource.html
 */
module.exports.toFhir = function (resourceType, id="TEST_ID", resourceMetaData, implicitRules, languageCode=DEFAULT_LANGUAGE_CODE) {
    return {
        "resourceType" : resourceType,
        "id" : "<id>", // Logical id of this artifact
        "meta" : resourceMetaData, // Metadata about the resource
        "implicitRules" : implicitRules, // A set of rules under which this content was created
        "language" : languageCode
    }
};