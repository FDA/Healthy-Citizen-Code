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
