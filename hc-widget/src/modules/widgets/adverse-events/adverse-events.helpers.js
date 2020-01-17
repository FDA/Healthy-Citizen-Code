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
  const age = (event) => {
    return {value: event.patientOnSetAge, unit: event.patientOnSetAgeUnit }
  };

  medications.forEach(medication => {
    medication.list = medication.list.map(event => {
      return {
        // TODO: fix complex data like age, which requires several fields init
        "Date of Receipt": createEvent(event.receiptDate, openFdaHelpers.dateToMmDdYyyy, 'Date'),
        "Gender": createEvent(event.patientSex, openFdaHelpers.gender),
        "Age": createEvent(age(event), openFdaHelpers.age, 'Number'),
        "Severity": createEvent(event.serious || '0', openFdaHelpers.seriousness, 'Number'),
        "Reactions": createEvent(event.reactions.map(reaction => reaction.reactionMedDraPT).join(', ')),
        "Safety Report ID": createEvent(event.safetyReportId, openFdaHelpers.eventLink),
        "Medications Involved": createEvent(event.drugs, openFdaHelpers.medications)
      }
    })
  });

  return medications;
}

export function adverseEventsHeads() {
  return [
    "Date of Receipt",
    "Gender",
    "Age",
    "Severity",
    "Reactions",
    "Safety Report ID",
    "Medications Involved"
  ]
}
