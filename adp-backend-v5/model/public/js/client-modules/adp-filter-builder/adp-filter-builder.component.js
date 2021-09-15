(function () {
  "use strict";

  angular.module("app.adpFilterBuilder")
         .component("adpFilterBuilder",
           {
             template:
               "<form name=\"form\"" +
               "      class=\"smart-form client-form filter-builder\">" +
               "    <header class=\"smart-form-header\">" +
               "        <h2 class=\"semi-bold\">Filter Builder</h2>" +
               "    </header>" +
               "    <fieldset>" +
               "        <div class=\"col col-12\">" +
               "            <div class=\"filter-builder-container\"></div>" +
               "        </div>" +
               "    </fieldset>" +
               "    <footer class=\"adp-action-b-container\" adp-ui-buttons-handle-keyboard>" +
               "        <button class=\"adp-action-b-secondary\"" +
               "                type=\"button\"" +
               "                ng-click=\"vm.exit()\">Close</button>" +
               "        <button class=\"adp-action-b-tertiary\"" +
               "                type=\"button\"" +
               "                ng-click=\"vm.clear()\">Clear filter</button>" +
               "        <button class=\"adp-action-b-primary\"" +
               "                type=\"button\"" +
               "                ng-click=\"vm.save()\">Apply filter</button>" +
               "    </footer>" +
               "</form>",
             bindings: {
               resolve: "<",
               close: "&",
               dismiss: "&",
             },
             controller: "AdpFilterBuilderController",
             controllerAs: "vm",
           });
})();
