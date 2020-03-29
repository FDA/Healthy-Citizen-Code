ace.define("ace/mode/python_worker",[], function(require, exports, module) {
  "use strict";

  var oop = require("../lib/oop");
  var Mirror = require("../worker/mirror").Mirror;
  var parse = require("./python/python_parse").parse;

  var WorkerModule = exports.WorkerModule = function(sender) {
    Mirror.call(this, sender);
    this.setTimeout(200);
  };

  oop.inherits(WorkerModule, Mirror);

  (function() {

    this.onUpdate = function() {
      var value = this.doc.getValue();
      var errors = [];
      try {
        if (value)
          parse(value);
      } catch (e) {
        if (e instanceof SyntaxError) {
          var error = {
            row: e.loc.line - 1,
            column: e.loc.column,
            text: e.message,
            type: "error"
          };

          errors.push(error);
        }
      }

      this.sender.emit("annotate", errors);
    };

  }).call(WorkerModule.prototype);
});
