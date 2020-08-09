const  _ = require('lodash')
    , modelInstanceGenerator = require('./../generators/model_instance_generator').modelInstanceGenerate
    , modelsJson = require('./../src/data_model/model-v2')
    , model = modelInstanceGenerator(modelsJson.models.phi.encounters, "empty")
    , logger = require('log4js').getLogger()
    , lists = require('./../src/data_model/lists');

// const dischargeDispositionDefaultValue = {
//     key: 'U',
//     value: 'Uknown'
// };
// const dischargeDisposition = {
//     toFHIR: function (key) {
//         let dispositionValue = lists.discharge_dispositions[key];
//         if (!dispositionValue) {
//             return dischargeDispositionDefaultValue.value;
//         }
//         return dispositionValue;
//     },
//     fromFHIR: function (hospitalization) {
//         if (!hospitalization) {
//             return ""
//         }
//         let dischargeDisposition = dischargeDispositionDefaultValue.key;
//         if (!hospitalization["dischargeDisposition"]) {
//             return dischargeDisposition;
//         }
//         let dispositionList = lists.discharge_dispositions;
//         _.each(dispositionList, function (listValue, listKey) {
//            if (hospitalization["dischargeDisposition"]["text"] === listValue) {
//                dischargeDisposition = listKey;
//                return
//            }
//         });
//         return dischargeDisposition;
//     }
// };
// const periodDivider = " - ";
// const period = {
//     toFHIR: function (admissionDate, dischargeDate) {
//         return admissionDate + periodDivider + dischargeDate
//     },
//     fromFHIR: function (period ) {
//         if (!period) {
//             return {
//                 admissionDate: "",
//                 dischargeDate: ""
//             }
//         }
//         let splitPeriod = period.split(periodDivider);
//         return {
//             admissionDate: splitPeriod[0],
//             dischargeDate: splitPeriod[1]
//         }
//     }
// };
//
// module.exports.toFHIR = function (encounter) {
//     return {
//         "resourceType": "Encounter",
//         "identifier" : encounter.encounterId, // Identifier(s) by which this encounter is known
//         // "status" : "<code>", // R!  planned | arrived | in-progress | onleave | finished | cancelled
//         // "statusHistory" : [{ // List of past encounter statuses
//         //     "status" : "<code>", // R!  planned | arrived | in-progress | onleave | finished | cancelled
//         //     "period" : { Period } // R!  The time that the episode was in the specified status
//         // }],
// //         "class" : "<code>", // inpatient | outpatient | ambulatory | emergency +
//         "type" : encounter.encounterType, // Specific type of encounter
// //         "priority" : { CodeableConcept }, // Indicates the urgency of the encounter
// //         "patient" : { Reference(Patient) }, // The patient present at the encounter
// //         "episodeOfCare" : [{ Reference(EpisodeOfCare) }], // Episode(s) of care that this encounter should be recorded against
// //         "incomingReferral" : [{ Reference(ReferralRequest) }], // The ReferralRequest that initiated this encounter
// //         "participant" : [{ // List of participants involved in the encounter
// //             "type" : [{ CodeableConcept }], // Role of participant in encounter
// //             "period" : { Period }, // Period of time during the encounter participant was present
// //             "individual" : { Reference(Practitioner|RelatedPerson) } // Persons involved in the encounter other than the patient
// // }],
// //     "appointment" : { Reference(Appointment) }, // The appointment that scheduled this encounter
//         "period" : period.toFHIR(encounter.admissionDate, encounter.dischargeDate), // The start and end time of the encounter
// //     "length" : { Quantity(Duration) }, // Quantity of time the encounter lasted (less time absent)
// //     "reason" : [{ CodeableConcept }], // Reason the encounter takes place (code)
// //         "indication" : [{ Reference(Condition|Procedure) }], // Reason the encounter takes place (resource)
//         "hospitalization" : { // Details about the admission to a healthcare service
// //         "preAdmissionIdentifier" : { Identifier }, // Pre-admission identifier
// //         "origin" : { Reference(Location) }, // The location from which the patient came before admission
// //         "admitSource" : { CodeableConcept }, // From where patient was admitted (physician referral, transfer)
// //         "admittingDiagnosis" : [{ Reference(Condition) }], // The admitting diagnosis as reported by admitting practitioner
// //             "reAdmission" : { CodeableConcept }, // The type of hospital re-admission that has occurred (if any). If the value is absent, then this is not identified as a readmission
// //         "dietPreference" : [{ CodeableConcept }], // Diet preferences reported by the patient
// //             "specialCourtesy" : [{ CodeableConcept }], // Special courtesies (VIP, board member)
// //             "specialArrangement" : [{ CodeableConcept }], // Wheelchair, translator, stretcher, etc.
// //             "destination" : { Reference(Location) }, // Location to which the patient is discharged
//         "dischargeDisposition" : {
//             "coding": {
//                 // "system" : "<uri>", // Identity of the terminology system
//                 "version" : systemVersion, // Version of the system - if relevant
//                 // "code" : "<code>", // Symbol in syntax defined by the system
//                 // "display" : "<string>", // Representation defined by the system
//                 // "userSelected" : <boolean>
//             },
//             "text": dischargeDisposition.toFHIR(encounter.dischargeDisposition)
//         }, // Category or kind of location after discharge
// //         "dischargeDiagnosis" : [{ Reference(Condition) }] // The final diagnosis given a patient before release from the hospital after all testing, surgery, and workup are complete
//         },
// //     "location" : [{ // List of locations where the patient has been
// //         "location" : { Reference(Location) }, // R!  Location the encounter takes place
// //         "status" : "<code>", // planned | active | reserved | completed
// //         "period" : { Period } // Time period during which the patient was present at the location
// //     }],
// //         "serviceProvider" : { Reference(Organization) }, // The custodian organization of this Encounter record
// //     "partOf" : { Reference(Encounter) } // Another Encounter this encounter is part of
//     }
// };
const getEncounterClass = {
    fromFHIR: (encounter) => {
        const list = lists.encounter_types;
        const relationsMap = {
            //FHIR format: HC format
            inpatient: "IP", // TODO there need check relations by Josh
            outpatient: "AV",
            ambulatory: "IS",
            emergency: "ED",
            home: "HO",
            field: "FD",
            daytime: "DT",
            virtual: "VR",
            other: "OA"
        };
        return relationsMap[encounter.class];
    }
};

const getFacilityLocation = {
    fromFHIR: (encounter) => {
        try {
            if (encounter && encounter.serviceProvider && encounter.serviceProvider.display) {
                return encounter.serviceProvider.display
            }
            return undefined;
        } catch (error) {
            throw error;
        }
    }
};

const provider = {
    getIdFromFhirFormat: function (encounter) {
        try {
            if (encounter && encounter.serviceProvider && encounter.serviceProvider.reference) {
                return encounter.serviceProvider.reference.split("/")[1];
            }
            return undefined;
        }
        catch (error) {
            throw error;
        }
    }
};

module.exports.fromFHIR = function (encounter, encounterModel) {
    try {
        let newEncounter = {
            "encounterId": encounter.id,
            "providerId": provider.getIdFromFhirFormat(encounter),
            "encounterType": getEncounterClass.fromFHIR(encounter),
            "facilityLocation": getFacilityLocation.fromFHIR(encounter),
            // Add get info from hospitalization field.
        };
        if (encounter.period) {
            newEncounter["admissionDate"] = encounter.period.start;
            newEncounter["dischargeDate"] = encounter.period.end;
        }
        return newEncounter;
    }
    catch (error) {
        logger.warn("error " + error + "in encounter adapter in method fromFHIR, with encounter: ", encounter, " This encounter will be ignore.");
        return false
    }
};

module.exports.addLocationInfoToEncounter = (encounterInHcFormat, fhirResources) => {
    if (encounterInHcFormat.facilityLocation) {
        _.each(fhirResources, function (resource) {
            if (resource.resource.resourceType === "Location" && resource.resource.name === encounterInHcFormat.facilityLocation) {
                encounterInHcFormat.facilityCode = resource.resource.type.coding[0].code;
            }
        });
    }
};