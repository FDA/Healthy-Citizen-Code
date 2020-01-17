export default {
  eventLink: id => `<a href="https://rxisk.org/adverse_event_report/${id}" target="_blank">${id}</a>`,

  seriousness(number) {
    const map = {
      '1': '1 (Serious)',
      '2': '2 (Not serious)',
      '3': 'N (N/A)',
    };

    return map[number];
  },

  gender(code) {
    const genders = ['Unknown', 'Male', 'Female'];
    return genders[code];
  },

  age({value, unit}) {
    const units = {
      '800': 'Decade',
      '801': 'Year',
      '802': 'Month',
      '803': 'Week',
      '804': 'Day',
      '805': 'Hour'
    };

    return value ? `${value}, ${units[unit]}` : 'N/A';
  },

  medications(drugs) {
    const drugcharacterizations = {
      '1': 'Suspect',
      '2': 'Concomitant',
      '3': 'interacting'
    };

    return drugs.map(drug => {
      let drugcharacterization = drugcharacterizations[drug.drugCharacterization];

      return [drug.medicinalProduct, drugcharacterization].join(' - ');
    }).join('<br>');
  },

  openFdaDate(string) {
    // 'YYYYMMDD' format of recepitdate of openfda API
    let year = string.substring(0, 4);
    let month = string.substring(4, 6);
    let day = string.substring(6);

    let date = new Date(year, month, day);

    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  },

  dateToMmDdYyyy(dateString) {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  }
};
