import { BaseError } from './BaseError';

export class ConfigurationError extends BaseError {
  constructor(message) {
    super(message);
  }

  static get NOT_IN_IFRAME() {
    return 'Trying to initialize widget outside of iframe.';
  }

  static get WIDGET_NOT_FOUND() {
    return 'Widgets not found on the page OR required attribute "hc-widget" is missing.';
  }

  static get unableToFetch() {
    return 'unable to fetch configuration from Widget Manager.';
  }

  static get widgetIdRequired() {
    return 'Incorrect widget configuration. Please contact this website\'s administrator and ask to provide correct required parameters: "widgetId" in the widget loading code.'
  }

  static get typeRequired() {
    return 'Incorrect widget configuration. Please contact this website\'s administrator and ask to provide correct required parameters: "type" in the widget loading code.'
  }
}
