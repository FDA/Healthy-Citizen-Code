import { BaseError } from './BaseError';

export class AssertionError extends BaseError {
  constructor(message) {
    super(message);
  }
}
