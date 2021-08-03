module.exports = {
  tabs: { // this object lists all tabs in the output .xls file
    fields: {
      models: { // for each tab
        columns: ['Name', 'Type', 'Subtype', 'Full Name', 'Description', 'Required', 'Lookup', 'Parameters', 'Show In Datatable', 'Render', 'Show'], // Plus implicit "Other"
      },
      interface: { columns: ['Name', 'Type', 'Link', 'Icon', 'Visible', 'Components', 'Default'], // Plus implicit "Other"
      },
    },
  },
};
