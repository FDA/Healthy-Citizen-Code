function trimSpaceChars (str) {
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

  for (let i = str.length - 1; i > 0; i--) {
    const c = str[i];
    if (nonSpaceRegEx.test(c)) {
      end = i;
      break;
    }
  }

  return str.slice(start, end + 1);
}


module.exports = {
  trimSpaceChars,
};
