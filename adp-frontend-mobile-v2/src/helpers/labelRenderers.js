import {generateDateString} from './date';

const labelRenderer = {
  encounter: (encounter) => {
    const date = encounter.admissionDate ? generateDateString(new Date(encounter.admissionDate)) : 'Unknown Date';

    return `${
      encounter.providerName || 'Unknown Provider'
    } ${
      encounter.encounterType || 'Unknown Encounter Type'
    }@${
      encounter.facilityLocation || 'Unknown Facility Location'
    }, ${
      date
    }`;
  }
};

export default labelRenderer;
