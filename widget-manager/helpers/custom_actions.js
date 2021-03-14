module.exports = function () {

    var m = {
        getCode() {
            const options = {
                title: 'Code to embed the Widget',
                message: `
                  Paste this code on your website in order to display this widget:<br /><br />
                  
<pre>&lt;script
    src="https://widget-manager-backend.conceptant.com/widget-server/hc-widget.js"
    data-fhir-id="&lt;Patient ID/Token&gt;"
    data-widget-id="${this.row.id}"
&gt;&lt;/script&gt;</pre>
                `,
            }

            const injector = angular.element(document).injector();
            const adpModalService = injector.get('AdpModalService');

            adpModalService.alert(options);
        }
    };
    return m;
};
