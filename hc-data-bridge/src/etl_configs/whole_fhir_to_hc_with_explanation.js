module.exports = {
  // Settings for extracting object from FHIR server
  // Here we need to build one url that get the whole data with needed references
  // However it may be several urls that build object
  extract: [
    // Here we're building urls. Base server URL should be received from external
    // Building first url
    {
      resource: 'Patient',
      // Define params to get url like:
      // http://test.fhir.org/r3/Patient?&_revinclude=Encounter:subject&_revinclude=Immunization:patient&_format=json
      params: {
        _id: '%id%',
        _revinclude: [
          'Encounter:subject',
          'Immunization:patient',
        ],
        _format: 'json',
      },
      // Path to which data will be extracted
      // For example response for user can be extracted to "user" path, meta for "meta" etc..
      // Empty path means extracting in root
      pathToExtract: '',
    },
  ],
  // Transform extracted data from "extractToDataPump" stage
  transform: {
    // Contains functions to pretransform FHIR response. Can be hardcoded for first times.
    // For example, related objects is appeared in ‘entry’ field which is array.
    // We need to form object with related object for example { “Observation”: {...}, “Device”: {...}}
    pretransform: [
    ],
    // Field in output object that will be passed to "transform" stage
    piis: {
      demographics: {
        // Nested field
        // Will be written in "piis.demographics.birthDate"
        birthDate: {
          // path - object that will be passed to transformData functions
          // If needed to combine multiple fields for example birthDate + name.given - leave path "Patient"
          // Then write function that gets data from the root object
          path: 'Patient.birthDate',
          // Names of functions defined in transformationService
          // transformationService is placed in services with the same filename as current
          transform: [],
        },
        ageRange: {
          path: 'Patient.birthDate',
          transform: [
            'birthDateToAgeRange',
          ],
        },
        gender: {
          path: 'Patient.gender',
          transform: [
            // Empty because no transformations needed
            // Data from "Patient.gender" will be written in "piis.demographics.gender"
          ],
        },
        // hispanic is not supported by default FHIR thus no need to specify it
        // "hispanic": {},
        // race is not supported by default FHIR thus no need to specify it
        // "race": {},
      },
      hospitals: {
        // Not decided what to map
      },
      firstName: {
        path: 'Patient.name.given',
        transform: [],
      },
      lastName: {
        path: 'Patient.name.family',
        transform: [],
      },
      displayName: {
        // Not decided
      },
      email: {
        path: 'Patient.telecom',
        transform: [
          'telecomToEmail',
        ],
      },
    },
    phis: {
      deaths: {
        date: {
          path: 'Patient',
          transform: [
            'patientToDeathDate',
          ],
        },
      },
      groupings: {
        // To be determined
        // "medicalConditions": {},
        // "medicationTypes": {},
        procedures: {
          path: 'Procedure.code',
          transform: [
            'procedureToProcedures',
          ],
        },
        // No data
        // "diabetesTypes": {},
        diagnosis: {
          path: 'Condition.code',
          transform: [
            'conditionCodeToDiagnosis',
          ],
        },
        //
        // "glucoseAverages": {},
        yearsWithDiabetes: {
          path: 'Condition.assertedDate',
          transform: [
            'assertedDateToYearsWithDiabetes',
          ],
        },
      },
      encounters: {
        diagnoses: {
          sourceType: {},
          admissionDate: {
            path: 'Encounter.diagnosis',
            transform: [
              'diagnosisToAdmissionDate',
            ],
          },
          providerId: {},
          diagnosisCode: {},
          diagnosisCodeType: {},
          originalDiagnosisCode: {},
          principalDischargeDiagnosis: {},
        },
        procedures: {},
        vitalSigns: {
          sourceType: {},
          measureDate: {
            path: 'Observation',
            transform: [
              'observationToMeasureDate',
            ],
          },
          height: {},
          weight: {},
          bloodPressureType: {},
          bloodPressurePosition: {
            path: 'Observation.bodySite',
            transform: [
              'bodySiteToBloodPressurePosition',
            ],
          },
          systolic: {},
          diastolic: {},
          tobaccoStatus: {},
          tobaccoType: {},
        },
        // Should be generated or copied from source server?
        encounterId: {
          path: 'Encounter.id',
          transform: [],
        },
        // FHIR server url? should be received from external data?
        sourceType: {},
        admissionDate: {
          path: 'Encounter.period.start',
          transform: [],
        },
        dischargeDate: {
          path: 'Encounter.period.end',
          transform: [],
        },
        // Provider id should be received from meta?
        providerId: {
          path: 'Encounter.participant',
          transform: [
            // To be determined
          ],
        },
        providerName: {
          path: 'Encounter.participant',
          transform: [
            // To be determined
          ],
        },
        // Doesn't match with HC
        encounterType: {
          path: 'Encounter.type',
          transform: [],
        },
        // Handle address?
        facilityLocation: {
          path: 'Encounter.location',
          transform: [
            'locationToFacilityLocation',
          ],
        },
        facilityCode: {
          path: 'Encounter.location',
          transform: [
            'locationToFacilityCode',
          ],
        },
        dischargeDisposition: {
          path: 'Encounter.hospitalization',
          transform: [
            'hospitalizationToDischargeDisposition',
          ],
        },
        // To be determined
        dischargeStatus: {},
        // To be determined
        diagnosisRelatedGroup: {},
        // To be determined
        diagnosisRelatedGroupType: {},
        // To be determined
        admittingSource: {},
      },
    },
  },
  // Load can be done in one request(batch) with FHIR: https://www.hl7.org/fhir/http.html#transaction
  // However we cannot guarantee it for other protocols.
  // We consider REST services, so we need URL, data, headers(for auth maybe) to send requests.
  load: [
    {
      path: '/create',
      // "port": "80",
      method: 'POST',
      headers: {
        Authorization: 'Bearer 1234',
        Another_header: 'value',
      },
    },
  ],
};
