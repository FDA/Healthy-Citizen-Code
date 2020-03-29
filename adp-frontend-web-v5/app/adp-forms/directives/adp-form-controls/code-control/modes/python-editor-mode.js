(function () {
  'use strict'

  var WorkerClient = ace.require('ace/worker/worker_client').WorkerClient;
  var PythonMode = ace.require('ace/mode/python').Mode;

  function PythonModeWithWorker() {
    PythonMode.apply(this, arguments);
  }

  PythonModeWithWorker.prototype = Object.create(PythonMode.prototype);

  PythonModeWithWorker.prototype.createWorker = function (session) {
    var worker = new WorkerClient(['ace'], 'ace/mode/python_worker', 'WorkerModule')
    worker.attachToDocument(session.getDocument())

    worker.on('annotate', function (results) {
      session.setAnnotations(results.data);
    });

    worker.on('terminate', function () {
      session.clearAnnotations()
    })

    return worker
  };

  angular
    .module('app.adpForms')
    .factory('PythonEditorMode', function () {
      return PythonModeWithWorker;
    });
})();
