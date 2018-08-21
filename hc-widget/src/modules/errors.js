function HttpError(message) {
  Error.call(this, message) ;
  this.name = "HttpError";
  this.message = message;

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, HttpError);
  } else {
    this.stack = (new Error()).stack;
  }

}

HttpError.prototype = Object.create(Error.prototype);

export {HttpError};
