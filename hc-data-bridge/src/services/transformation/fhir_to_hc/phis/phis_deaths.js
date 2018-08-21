module.exports = {
  patientToDeathDate (patient) {
    const { deceasedDateTime } = patient;
    return deceasedDateTime ? new Date(deceasedDateTime) : null;
  },
};
