import { preferencesQuery } from '../user-preferences/user-preferences';

export function rxcuiCodingsFromUserPreferences({ udid }) {
  return preferencesQuery(udid)
    .then((data) => {
      const medications = data.medications || [];
      return medications.map((m) => m.rxcui);
    });
}
