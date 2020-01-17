const requestFormatter = {
  age(age) {
    if (age) {
      const [begin, end] = age.split('-');

      // 200 - is magical here, because we need some really high value for right age range boundary
      // 200 is seems ok, because nobody lived that much yet
      return { begin: Number(begin), end: end || 200 };
    }
    return { begin: 0, end: 200 };
  },

  gender(gender) {
    // mapping pagweb values to opendfda
    // check API reference for patientsex for more details https://open.fda.gov/drug/event/reference/
    const sexes = {
      M: '1',
      F: '2',
    };

    return sexes[gender] || '0';
  },
};

const mongoQuery = (rxcui, { age, gender }) => {
  const q = {
    $and: [
      { patientOnSetAge: { $gt: age.begin } },
      { patientOnSetAge: { $lt: age.end } },
      { patientOnSetAgeUnit: '801' },
      { patientSex: gender },
      {
        drugs: {
          $elemMatch: {
            'openfda.rxCuis.rxCui': rxcui,
            drugCharacterization: { $in: ['1', '3'] },
          },
        },
      },
    ],
  };

  return JSON.stringify(q).replace(/"/g, '\\"');
};

function getQueryForEvent(rxcui, params) {
  return `q${rxcui}:aesOpenfdaDrugs (
      filter: { mongoQuery: "${mongoQuery(rxcui, params)}" },
      perPage: 2000
    ) {
      pageInfo { itemCount }
      items {
        _id
        reactions { reactionMedDraPT }
      }
    }`;
}

export function adverseEventQuery(params) {
  const age = requestFormatter.age(params.age);
  const gender = requestFormatter.gender(params.gender);

  return getBatchQuery({ age, gender, medications: params.medications });
}

function getBatchQuery(params) {
  const parts = params.medications.map(({ rxcui }) => getQueryForEvent(rxcui[0], params)).join('');

  return `query {
    ${parts}
  }`;
}

export function formatAdverseEventResponse(resp, medications) {
  return medications
    .filter(medication => {
      const rxcui = medication.rxcui[0];
      const r = resp[`q${rxcui}`];

      return r.pageInfo.itemCount > 0;
    })
    .map(medication => {
      const { rxcui, brandName } = medication;
      const r = resp[`q${rxcui}`];

      return {
        brandName,
        total: r.pageInfo.itemCount,
        list: r.items.map(i => i.reactions),
      };
    });
}
