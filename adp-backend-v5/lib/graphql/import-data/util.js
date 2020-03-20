function getOverallErrorResponse(message) {
  return { importedRowsNumber: 0, errors: { overall: message } };
}

function getResponseWithErrors(errors) {
  return { importedRowsNumber: 0, errors };
}

function getSuccessfulResponse(importedRowsNumber) {
  return { importedRowsNumber };
}

module.exports = {
  getOverallErrorResponse,
  getResponseWithErrors,
  getSuccessfulResponse,
};
