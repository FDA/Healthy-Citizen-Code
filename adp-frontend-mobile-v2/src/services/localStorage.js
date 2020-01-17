let temporaryStorage = {};

export const getOption = key => temporaryStorage[key] || null;

export const setOption = (key, value) => {
  temporaryStorage[key] = value;
};

export const clearOption = key => {
  delete temporaryStorage[key];
};
