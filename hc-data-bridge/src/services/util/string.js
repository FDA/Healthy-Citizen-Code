/** Converts "\t 1 5 \t" to "1 5" */
exports.trimSpaceChars = (str) => {
  const nonSpaceRegEx = /\S/;
  let start = 0;
  let end = -1;

  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (nonSpaceRegEx.test(c)) {
      start = i;
      break;
    }
  }

  for (let i = str.length - 1; i >= start; i--) {
    const c = str[i];
    if (nonSpaceRegEx.test(c)) {
      end = i;
      break;
    }
  }

  return str.slice(start, end + 1);
};
