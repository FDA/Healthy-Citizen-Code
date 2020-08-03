ace.define("ace/mode/json5_worker",[], function(require, exports, module) {
  "use strict";

  var oop = require("../lib/oop");
  var Mirror = require("../worker/mirror").Mirror;
  var parse = require("./json/json5_parse").parse;

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
        value && parse(value);
      } catch (e) {
        if (e instanceof SyntaxError) {
          errors.push({
            row: e.lineNumber - 1,
            column: e.columnNumber,
            text: e.message,
            type: "error",
            value: value,
          });
        }
      }

      this.sender.emit("annotate", errors);
    };
  }).call(WorkerModule.prototype);
});
