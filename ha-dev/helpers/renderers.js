/**
 * Renderers are used to render data for both datatables and server-generated export
 * WARNING: avoid using ES6 in this file as it will be used both on back and frontend.
 *
 * Each renderer receives this fixed set of parameters:
 * data - the cell data
 * type - type of rendering: filter, display, sort, undefined, etc
 * row - the entire record the data need to be rendered for
 * meta - metainformation in datatables format: https://datatables.net/reference/option/columns.render
 */

module.exports = function () {
    var m = {
        reportIdLink: function(data, type, row) {
            var id = row.safetyReportId;
            return '<a href="https://rxisk.org/adverse_event_report/' + id +  '" target="_blank">' + row.safetyReportId + '</a>';
        },
        stringToColor: function(s)  {
            // TODO: sum letters, mod to array and return palette element: https://coolors.co/c3f73a-95e06c-68b684-094d92-1c1018
        },
        notificationFlagged: function (data, type, row, meta) {
            var value = Boolean(row.flagged);

            return [
                value ? '<i class="fa fa-fw fa-flag"></i>' : '',
                // make searchable
                '<span class="hidden">' + value + '</span>'
            ].join('');
        },
        notificationAttachments: function (data, type, row, meta) {
            return "<i class=\"fa fa-fw fa-paperclip\"/>" ;
        },
        notificationSubject: function (data, type, row, meta) {
            var flagged = row.flagged ? '<div class="notification-flagged"><i class="fa fa-fw fa-flag"></i></div>' : '<div class="notification-flagged">&nbsp;</div>';
            var tags = row.tags.length > 0 ? "<span class=\"notification-tag\">" + row.tags.join( "</span><span class=\"notification-tag\">" ) + "</span> " : "";

            var notificationBody = ( row.new ? "<b>" : "" ) + tags + data + ( row.new ? "</b>" : "" );

            //console.log(flagged);
            return '<div class="notification-subject" data-notification-id="' + row._id + '">' + '<div class="notification-subject-text">' + ( row.new ? "<b>" : "" ) + tags + data + ( row.new ? "</b>" : "" ) + '</div></div>';
        },
        nameAndNotifications: function(data, type, row, meta) {
            // (" + (row.numNewNotifications || 0) + " new)
            return data + "<br/>" +
                "<a href=\"/notifications?profile=" + row._id + "\">" + (row.numNotifications || 0) + " notifications </a><br>"
            ;
        },
        treatment: function (data, type, row, meta) {
            return "<a href=\"/drugsMaster?profile=" + row._id + "\">" + _.get(data, "length", 0) + " drugs</a><br>" +
                   "<a href=\"/devices?profile=" + row._id + "\">" + _.get(row, "devices.length", 0) + " devices</a><br>" /* +
                   "<nobr></nobr><a href=\"/aeForDevices?profile=" + row._id + "\">" + " Adverse Events for Devices</a></nobr><br>" +
                   "<nobr><a href=\"/aeForDrugs?profile=" + row._id + "\">" + " Adverse Events for Devices</a></nobr><br>" +
                   "<nobr><a href=\"/recallsForDevices?profile=" + row._id + "\">" + " Recalls for Devices</a></nobr><br>" +
                   "<nobr><a href=\"/recallsForDrugs?profile=" + row._id + "\">" + " Recalls for Drugs</a></nobr><br>" */
                ;
        },
        diagnosis: function (data, type, row, meta) {
            return "<a href=\"/icdcodes?profile=" + row._id + "\">" + _.get(data, "length", 0) + " diagnoses</a><br>" /* +
                _.get(row, "totalArticles", 0) + " articles (" + _.get(row, "newArticles", 0) + " new)<br>" +
                _.get(row, "totalStudies", 0) + " studies (" + _.get(row, "newStudies", 0) + " new)" */
                ;
        },
        arrayOfStrings: function (data, type, row, meta) {
            return data ? "<ul><li>"+data.join("<li></li>")+"</li></ul>" : "";
        },
        'medline': function (data, type, row, meta) {
            //https://vsearch.nlm.nih.gov/vivisimo/cgi-bin/query-meta?v%3Aproject=medlineplus&v%3Asources=medlineplus-bundle&query=
            return "<iframe style=\"width: 560px;height: 300px;border: 0 none;\" src=\"https://en.m.wikipedia.org/w/index.php?search=" + row.name + "&go=Go\"></iframe>"
            //return "<iframe style=\"width: 560px;height: 400px;border: 0 none;\" src='https://vsearch.nlm.nih.gov/vivisimo/cgi-bin/query-meta?v%3Aproject=medlineplus&v%3Asources=medlineplus-bundle&query=" + row.name + "'></iframe>"
            //return "<iframe style=\"width: 560px;height: 400px;border: 0 none;\" src='https://en.m.wikipedia.org/w/index.php?title=" + row.name + "&go=Go&mobileaction=toggle_view_mobile'></iframe>"
        },
        device: function(data, type, row, meta) {
            return "<a href=\"/productsdevices\">" + _.get( data, "length", 0 ) + " devices</a><br>" +
                _.get( row, "totalDeviceArticles", 0 ) + " articles (" + _.get( row, "newDeviceArticles", 0 ) + " new)<br>" +
                _.get( row, "totalDeviceStudies", 0 ) + " studies (" + _.get( row, "newDeviceStudies", 0 ) + " new)"
                ;
        },
        asBoolean: function(data, type, row, meta) {
            return data > 0.5 ? 'YES' : 'NO';
        },
        aesReactions: function(data, type, row, meta) {
            return '<ul><li>' + _(data).map('reactionMedDraPT').join('</li><li>') + '</li></ul>';
        }
    };
    return m;
};
