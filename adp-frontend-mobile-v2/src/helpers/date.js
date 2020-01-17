const generateDateString = dateStr => {
  if (!dateStr) {
    return '-';
  }
  const date = new Date(dateStr);
  return `${('0' + (date.getMonth() + 1)).slice(-2)}/${('0' + date.getDate()).slice(-2)}/${date.getFullYear()}`;
};

const generateTimeString = dateStr => {
  if (!dateStr) {
    return '-';
  }
  const date = new Date(dateStr);
  return `${('0' + (date.getHours())).slice(-2)}:${('0' + date.getMinutes()).slice(-2)}`;
};

const generateDateTimeString = dateStr => {
  if (!dateStr) {
    return '-';
  }

  const generatedDate = generateDateString(dateStr);
  const generatedTime = generateTimeString(dateStr);
  return `${generatedDate} ${generatedTime}`;
};

export const formatTimeStringToISOString = timeStr => {
  if (!timeStr) {
    return null;
  }

  if (/^\d\d:\d\d$/.test(timeStr)) {
    const [hours, minutes] = timeStr.split(':');
    const date = new Date();
    date.setHours(parseInt(hours));
    date.setMinutes(parseInt(minutes));
    return date.toISOString();
  }
  // '11/11/2017' or '11/11/2017 08:55' can be passed to default constructor
  return new Date(timeStr).toISOString();
};

export const getDateGeneratorByDateSubtype = subtype => {
  if (subtype === 'Time') {
    return generateTimeString;
  } else if (subtype === 'DateTime') {
    return generateDateTimeString;
  } else {
    return generateDateString;
  }
};