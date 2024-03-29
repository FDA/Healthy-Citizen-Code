module.exports = function () {
  const m = {
    test: {
      a: 'a',
      b: 'b',
    },
    test2: {
      val1: 'val1',
      val2: 'val2',
      val3: 'val3',
      val4: 'val4',
    },
    dataSources: {
      // keep it in sync with CorpUtil/conceptant.js#dataPulls (or, in the future, 0_data_sources.json in the model)
      openFdaDeviceAdverseEventArchive: 'OpenFDA Device Adverse Events Local Archive',
      openFdaDeviceAdverseEventOnline: 'OpenFDA Device Adverse Events Online',
      medicationsNdcProductCode: "Josh's awesome mediations list with NDC codes in CSV",
    },
    citizenConditions: {
      // To be completed in HC-33, HC-34, HC-35 as a separate deliverable for synthetic patients generator
    },
  };

  return m;
};
