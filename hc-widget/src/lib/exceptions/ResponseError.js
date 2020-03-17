import { BaseError } from './BaseError';

export class ResponseError extends BaseError {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }

  static get FHIR_SERVER_ERROR() {
    return 'Invalid response from EPIC FHIR server';
  }

  static get EMPTY() {
    return 'Unable to get data.';
  }

  static get RESPONSE_EMPTY() {
    return 'Unable to fetch. No data for specified medications.';
  }

  static get RECALLS_EMPTY() {
    return 'Unable to fetch recalls. No data for specified medications.';
  }

  static get DRUG_INTERACTIONS_EMPTY() {
    return 'Unable to get drugs interactions.';
  }

  static get ADVERSE_EVENTS_EMPTY() {
    return 'Unable to get adverse events. No data for specified medications.';
  }

  static get MEDICATION_NAMES_EMPTY() {
    return 'Unable to get Medication Names. No data for specified medications.';
  }
}
