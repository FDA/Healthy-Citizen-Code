const _ = require('lodash')
    , modelInstanceGenerator = require('./../generators/model_instance_generator').modelInstanceGenerate
    , modelsJson = require('./../src/data_model/model-v2')
    , model = modelInstanceGenerator(modelsJson.models.pii, "empty");

const nameAdapter = {
        toFHIR: function (pii) {
            return {
                "resourceType": "HumanName",
                "use": "official", // usual | official | temp | nickname | anonymous | old | maiden
                // "text" : "<string>", // Text representation of the full name
                "family": pii.lastName, // Family name (often called 'Surname')
                "given": pii.firstName, // Given names (not always 'first'). Includes middle names
                // "prefix" : ["<string>"], // Parts that come before the name
                // "suffix" : ["<string>"], // Parts that come after the name
                // "period" : { Period } // Time period when name was/is in use
            }
        },
        fromFHIR: {
            firstName: function (name) {
                return name["given"]
            },
            lastName: function (name) {
                return name["family"]
            }
        }
    }
;
const genderAdapter = {
    toFHIR: function (gender) {
        // available returned values:  male | female | other | unknown
        const genderToFhirMap = {
            'F': "female",
            'M': "male",
            'A': "other",
            "U": "unknown"
        };
        let fhirGender = "unknown";
        if (genderToFhirMap[gender]) {
            fhirGender = genderToFhirMap[gender]
        }
        return fhirGender;
    },
    fromFHIR: function (fhirGender) {
        const genderFromFhirMap = {
            "female": 'F',
            "male": 'M',
            "other": 'A',
            "unknown": "U"
        };
        let gender = "unknown";
        if (genderFromFhirMap[fhirGender]) {
            gender = genderFromFhirMap[fhirGender]
        }
        return gender;
    }
}

module.exports.toFHIR = function (pii) {
    return {
        "resourceType": "Patient",
        // from Resource: id, meta, implicitRules, and language
        // from DomainResource: text, contained, extension, and modifierExtension
        "identifier": pii.email, // An identifier for this patient
        "active": true, // Whether this patient's record is in active use
        "name": nameAdapter.toFHIR(pii), // A name associated with the patient
//         "telecom": [{ContactPoint}], // A contact detail for the individual
        "gender": genderAdapter.toFHIR(pii.demographic.gender), // male | female | other | unknown
        "birthDate": pii.demographic.birthDate, // The date of birth for the individual
//         // deceased[x]: Indicates if the individual is deceased or not. One of these 2:
//         "deceasedBoolean": "< boolean >",
//         "deceasedDateTime"    :
//     "<dateTime>",
//         "address"
//     :
//     [{Address}], // Addresses for the individual
//         "maritalStatus"
//     :
//     {
//         CodeableConcept
//     }
//     , // Marital (civil) status of a patient
//     // multipleBirth[x]: Whether patient is part of a multiple birth. One of these 2:
//     "multipleBirthBoolean"
//     : <
//     boolean >,
//         "multipleBirthInteger"
//     : <
//     integer >,
//         "photo"
//     :
//     [{Attachment}], // Image of the patient
//         "contact"
//     :
//     [{ // A contact party (e.g. guardian, partner, friend) for the patient
//         "relationship": [{CodeableConcept}], // The kind of relationship
//         "name": {HumanName}, // A name associated with the contact person
//         "telecom": [{ContactPoint}], // A contact detail for the person
//         "address": {Address}, // Address for the contact person
//         "gender": "<code>", // male | female | other | unknown
//         "organization": {Reference(Organization)}, // C? Organization that is associated with the contact
//         "period": {Period} // The period during which this contact person or organization is valid to be contacted relating to this patient
//     }],
//         "animal"
//     :
//     { // This patient is known to be an animal (non-human)
//         "species"
//     :
//         {
//             CodeableConcept
//         }
//     , // R!  E.g. Dog, Cow
//         "breed"
//     :
//         {
//             CodeableConcept
//         }
//     , // E.g. Poodle, Angus
//         "genderStatus"
//     :
//         {
//             CodeableConcept
//         } // E.g. Neutered, Intact
//     }
//     ,
//     "communication"
//     :
//     [{ // A list of Languages which may be used to communicate with the patient about his or her health
//         "language": {CodeableConcept}, // R!  The language which can be used to communicate with the patient about his or her health
//         "preferred": < boolean > // Language preference indicator
// }],
//     "careProvider"
//     :
//     [{Reference(Organization | Practitioner
//     )
// }], // Patient's nominated primary care provider
//     "managingOrganization"
//     :
//     {
//         Reference(Organization)
//     }
//     , // Organization that is the custodian of the patient record
//     "link"
//     :
//     [{ // Link to another patient resource that concerns the same actual person
//         "other": {Reference(Patient)}, // R!  The other patient resource that the link refers to
//         "type": "<code>" // R!  replace | refer | seealso - type of link
//     }]
}
};


module.exports.fromFHIR = function (fhirData, piiModel) {
    let piiCopy;
    if (piiModel) {
        piiCopy = _.cloneDeep(piiModel);
    } else {
        piiCopy = _.cloneDeep(model);
    }
    piiCopy.email = fhirData["identifier"]; // An identifier for this patient
    piiCopy.firstName = nameAdapter.fromFHIR.firstName(fhirData["name"]); // A name associated with the patient
    piiCopy.lastName = nameAdapter.fromFHIR.lastName(fhirData["name"]);
//         "telecom": [{ContactPoint}], // A contact detail for the individual
    piiCopy.demographic.gender = genderAdapter.fromFHIR(fhirData["gender"]), // male | female | other | unknown
    piiCopy.demographic.birthDate = fhirData["birthDate"]; // The date of birth for the individual
//         // deceased[x]: Indicates if the individual is deceased or not. One of these 2:
//         "deceasedBoolean": "< boolean >",
//         "deceasedDateTime"    :
//     "<dateTime>",
//         "address"
//     :
//     [{Address}], // Addresses for the individual
//         "maritalStatus"
//     :
//     {
//         CodeableConcept
//     }
//     , // Marital (civil) status of a patient
//     // multipleBirth[x]: Whether patient is part of a multiple birth. One of these 2:
//     "multipleBirthBoolean"
//     : <
//     boolean >,
//         "multipleBirthInteger"
//     : <
//     integer >,
//         "photo"
//     :
//     [{Attachment}], // Image of the patient
//         "contact"
//     :
//     [{ // A contact party (e.g. guardian, partner, friend) for the patient
//         "relationship": [{CodeableConcept}], // The kind of relationship
//         "name": {HumanName}, // A name associated with the contact person
//         "telecom": [{ContactPoint}], // A contact detail for the person
//         "address": {Address}, // Address for the contact person
//         "gender": "<code>", // male | female | other | unknown
//         "organization": {Reference(Organization)}, // C? Organization that is associated with the contact
//         "period": {Period} // The period during which this contact person or organization is valid to be contacted relating to this patient
//     }],
//         "animal"
//     :
//     { // This patient is known to be an animal (non-human)
//         "species"
//     :
//         {
//             CodeableConcept
//         }
//     , // R!  E.g. Dog, Cow
//         "breed"
//     :
//         {
//             CodeableConcept
//         }
//     , // E.g. Poodle, Angus
//         "genderStatus"
//     :
//         {
//             CodeableConcept
//         } // E.g. Neutered, Intact
//     }
//     ,
//     "communication"
//     :
//     [{ // A list of Languages which may be used to communicate with the patient about his or her health
//         "language": {CodeableConcept}, // R!  The language which can be used to communicate with the patient about his or her health
//         "preferred": < boolean > // Language preference indicator
// }],
//     "careProvider"
//     :
//     [{Reference(Organization | Practitioner
//     )
// }], // Patient's nominated primary care provider
//     "managingOrganization"
//     :
//     {
//         Reference(Organization)
//     }
//     , // Organization that is the custodian of the patient record
//     "link"
//     :
//     [{ // Link to another patient resource that concerns the same actual person
//         "other": {Reference(Patient)}, // R!  The other patient resource that the link refers to
//         "type": "<code>" // R!  replace | refer | seealso - type of link
//     }]
    
    return piiCopy;
};