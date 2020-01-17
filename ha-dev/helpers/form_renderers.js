module.exports = function () {
    var m = {
        'medline': function (data, row, modelSchema) {
            return "<iframe src='https://en.wikipedia.org/w/index.php?search=" + row.name + "&go=Go&mobileaction=toggle_view_mobile'></iframe>"
        }
    };
    return m;
};
