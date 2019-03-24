module.exports = function () {

    var m = {
        "getCode": function( row ) {
            $.SmartMessageBox({
                title: "Code to embed the Widget",
                content: "Paste this code on your website in order to display this widget: <div>&lt;script\n" +
                    "        src=\"https://widget-manager-backend.conceptant.com/widget-server/hc-widget.js\"\n" +
                    "        data-fhir-id=\"&lt;Patient ID/Token&gt;\"\n" +
                    "        data-widget-id=\""+ row.id+"\"\n" +
                    "&gt;</div>", //Are you sure you want to " + component + " for site '" + row.name + "' (ID:" + row._id + ")?
                buttons: "[Ok]"
            });
        }
    };
    return m;
};