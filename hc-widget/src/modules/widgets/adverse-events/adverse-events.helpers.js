import openFdaHelpers from "../../open-fda-helpers";

function createEvent(data, formatFn, type) {
  let isObject = typeof data === 'object';
  let value = isObject ? data.value : data;
  let viewValue;

  if (formatFn) {
    viewValue = isObject ? formatFn(data) : formatFn(value);
  } else {
    viewValue = data;
  }

  return {
    type,
    value,
    view: viewValue
  }
}

export function formatEvents(medications) {
  const age = (patient) => {
    return {value: patient.patientonsetage, unit: patient.patientonsetageunit }
  };

  medications.forEach(medication => {
    medication.list = medication.list.map(event => {
      return {
        // TODO: fix complex data like age, which requires several fields init
        "Date of Receipt": createEvent(event.receiptdate, openFdaHelpers.openFdaDate, 'Date'),
        "Gender": createEvent(event.patient.patientsex, openFdaHelpers.gender),
        "Age": createEvent(age(event.patient), openFdaHelpers.age, 'Number'),
        "Severity": createEvent(event.serious || '0', openFdaHelpers.seriousness, 'Number'),
        "Reactions": createEvent(event.patient.reaction.map(reaction => reaction.reactionmeddrapt).join(', ')),
        "Safety Report ID": createEvent(event.safetyreportid, openFdaHelpers.eventLink),
        "Medications Involved": createEvent(event.patient.drug, openFdaHelpers.medications)
      }
    })
  });

  return medications;
}
