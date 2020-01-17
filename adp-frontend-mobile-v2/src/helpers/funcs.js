export const array_chunk = (input, size) => {
  const length = input.length;
  let n = [];
  let groupIndex = -1;

  for (let i = 0; i < length; i++) {
    const itemIndex = i % size;

    if (!itemIndex) {
      groupIndex++;

      n[groupIndex] = [input[i]];
    } else {
      n[groupIndex][itemIndex] = input[i]
    }
  }

  return n;
};

export const _generateUUID = () => {
  let d = new Date().getTime();
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
  return uuid;
};

/**
 * Replace all words starting with '$' with corresponding replacement
 * Example:
   srcString = 'From $from to $to chars',
   replacements = {from: 5, to: 10}
   Result: 'From 5 to 10 chars'
 */
export const replaceParams = (srcString, replacements) => {
  if (!_.isString(srcString) || _.isEmpty(replacements)) {
    return srcString;
  }
  return srcString.replace(/\$(\w+)/g, (placeholder, p1) => {
    // p1 - first group. Do nothing if there is no replacement
    return replacements[p1] || placeholder;
  });
};