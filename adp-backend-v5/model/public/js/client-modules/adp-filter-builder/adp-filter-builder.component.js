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
               "    <footer>" +
               "        <button class=\"btn btn-default float-left\"" +
               "                type=\"button\"" +
               "                ng-click=\"vm.clear()\">Clear</button>" +
               "        <button class=\"btn btn-default\"" +
               "                type=\"button\"" +
               "                ng-click=\"vm.exit()\">Close</button>" +
               "        <button class=\"btn btn-primary\"" +
               "                type=\"button\"" +
               "                ng-click=\"vm.save()\">Ok</button>" +
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
