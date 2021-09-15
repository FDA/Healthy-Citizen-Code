(function () {
  angular
    .module('app.adpBpmDiagrams', [])
    .controller('DmnEditorController', getRuleEditorController('dmn'))
    .controller('BpmnEditorController', getRuleEditorController('bpmn'));

  /** @ngInject */
  function getRuleEditorController(diagramType) {
    return function (
      $scope,
      $state,
      APP_CONFIG,
      AdpBpmHelper,
      AdpClientCommonHelper,
      AdpNotificationService,
      $timeout,
      $location,
      AdpModalService,
      AdpFileDownloader,
      ResponseError,
      ErrorHelpers
    ) {
      var vm = this;
      var recordId = $state.params.uid;
      var diagram = AdpBpmHelper.getDiagramConfig(diagramType);
      var noProperEditorMsg = 'Editor is not initialized properly';

      vm.isLoading = true;
      vm.saveRules = saveRulesRecord;
      vm.diskLoad = loadRulesFromDisk;
      vm.diskSave = saveRulesToDisk;
      vm.nativeName = diagram.nativeName;
      vm.extraCSS = APP_CONFIG.resourceUrl + '/public/js/client-modules/adp-bpm-diagrams/adp-bpm-editor.css';
      vm.diagramType = diagramType;

      initialise();

      function initialise() {
        var promises = [];

        promises.push(
          AdpBpmHelper.loadRulesRecord(diagramType, recordId).then(function (res) {
            if (!res || !res[0]) {
              throw new ResponseError('Record is not found by ID');
            }
            vm.record = res[0];
          })
        );

        if (!AdpBpmHelper.isLibLoaded(diagramType)) {
          diagram.cssUrl && AdpClientCommonHelper.loadCss(diagram.cssUrl);
          promises.push(AdpClientCommonHelper.loadScript(diagram.jsUrl));
        }

        $.when
          .apply(this, promises)
          .then(function () {
            return AdpBpmHelper.getAdditionalData(diagramType, vm.record);
          })
          .then(function (additionalData) {
            vm.isLoading = false;
            $scope.$applyAsync();
            $timeout(function () {
              doStart(additionalData);
            });
          })
          .catch(function (error) {
            ErrorHelpers.handleError(error, 'Unknown error while loading record rules & editor code');
            throw error;
          });
      }

      function doStart(additionalData) {
        vm.instance = initModeller(additionalData);

        var diagram = AdpBpmHelper.getDiagram(diagramType, vm.record);

        doInitialOpenDiagram(diagram).catch(function (err) {
          AdpNotificationService.notifyError(err);

          var emptyDiagram = AdpBpmHelper.getDiagram(diagramType, {});

          doInitialOpenDiagram(emptyDiagram).catch(function (err) {
            AdpNotificationService.notifyError(err);
          });
        });
      }

      function doInitialOpenDiagram(definition) {
        return openDiagram(definition).then(AdpBpmHelper.getOnDiagramOpen(diagramType, vm));
      }

      function initModeller(additionalData) {
        return diagram.getInstance({
          additionalModules: [window.BpmnPropertiesPanelModule, window.BpmnPropertiesProviderModule],
          container: '#bpm-canvas',
          propertiesPanel: {
            parent: '#bpm-properties',
          },
          width: '100%',
          keyboard: {
            bindTo: window,
          },
          additionalData: additionalData,
        });
      }

      function openDiagram(definition) {
        var deferred = new $.Deferred();

        if (!vm.instance) {
          deferred.reject(noProperEditorMsg);
        } else {
          vm.instance.importXML(definition, function (err) {
            if (err) {
              console.log('Could not import diagram into modeller', err);
              deferred.reject(err);
            } else {
              deferred.resolve();
            }
          });
        }

        return deferred;
      }

      function saveRulesRecord() {
        return prepareDefinition(true)
          .then(replaceServiceTaskSingleQuotes)
          .then(function (definition) {
            if (definition) {
              return AdpBpmHelper.putRulesRecord(diagramType, vm, definition);
            }
        })
      }

      function replaceServiceTaskSingleQuotes(def){
         return def ? def.replace(/(\{environment.services.\w+\()&#39;(.*?)&#39;(\)\})/, "$1'$2'$3") : '';
      }

      function loadRulesFromDisk() {
        var typeName = diagramType.toUpperCase();

        return AdpModalService.readFile({
          title: typeName + ' rules file',
          validate: function (file) {
            if (file.name.substr(file.name.lastIndexOf('.') + 1) !== diagramType && file.type !== 'text/xml') {
              return 'Please select ' + typeName + ' or XML file';
            }
          },
        })
          .then(function (file) {
            return openDiagram(file.contents);
          })
          .then(function () {
            AdpNotificationService.notifySuccess('Rules are loaded successfully');
          })
          .catch(function (err) {
            AdpNotificationService.notifyError(err);
          });
      }

      function saveRulesToDisk() {
        return prepareDefinition()
          .then(replaceServiceTaskSingleQuotes)
          .then(function (definition) {
            if (definition) {
              return AdpFileDownloader({
                buffer: definition,
                mimeType: 'text/xml',
                fileName: AdpBpmHelper.getFileName(diagramType, recordId),
              });
            }
        });
      }

      function prepareDefinition() {
        if (diagramType === 'bpmn') {
          _.each(vm.instance._definitions.rootElements, function (root) {
            root.isExecutable = true;
          });
        }

        return new Promise(function(resolve, reject){
          if (!vm.instance) {
            reject(noProperEditorMsg);
          } else {
            vm.instance.saveXML({ format: true }, function (err, definition) {
              err ? reject(err) : resolve(definition);
            });
          }
        }).catch( function (err) {
          AdpNotificationService.notifyError(err);
        });
      }
    };
  }
})();
