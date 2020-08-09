export const generateDateString = date => {
  if (!date) {
    return '-';
  }

  return `${('0' + (date.getMonth() + 1)).slice(-2)}/${('0' + date.getDate()).slice(-2)}/${date.getFullYear()}`;
};
