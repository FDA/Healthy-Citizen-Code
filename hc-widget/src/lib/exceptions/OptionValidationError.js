import { BaseError } from './BaseError';

export class OptionValidationError extends BaseError {
  constructor(message, options) {
    super(message);

    this.expected = options.expected;
    this.actual = options.actual;
    this.schema = options.schema;
    this.optionName = options.name;
  }
}
