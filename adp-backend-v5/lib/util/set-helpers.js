function isIterable(obj) {
  // checks for null and undefined
  if (obj == null) {
    return false;
  }
  return typeof obj[Symbol.iterator] === 'function';
}

// Return all elements in sets a|b
function addToSet(a, b) {
  if (isIterable(b)) {
    for (const el of b) {
      a.add(el);
    }
  } else {
    a.add(b);
  }

  return a;
}

// Return all elements in sets a|b
function union(a, b) {
  a = a instanceof Set ? a : new Set(a);
  b = b instanceof Set ? b : new Set(b);

  return new Set([...a, ...b]);
}

// Return all elements in sets a&b
function intersection(a, b) {
  a = a instanceof Set ? a : new Set(a);
  b = b instanceof Set ? b : new Set(b);

  return new Set([...a].filter((v) => b.has(v)));
}

function difference(a, b) {
  a = a instanceof Set ? a : new Set(a);
  b = b instanceof Set ? b : new Set(b);

  return new Set([...a].filter((v) => !b.has(v)));
}

function disjunctiveUnion(a, b) {
  a = a instanceof Set ? a : new Set(a);
  b = b instanceof Set ? b : new Set(b);

  return difference(union(a, b), intersection(a, b));
}

function equal(a, b) {
  a = a instanceof Set ? a : new Set(a);
  b = b instanceof Set ? b : new Set(b);
  return a.size === b.size && typeof [...a].find((i) => !b.has(i)) === 'undefined';
}

function isStrictSubsetOf(a, b) {
  a = a instanceof Set ? a : new Set(a);
  b = b instanceof Set ? b : new Set(b);
  return b.size > a.size && isSubsetOf(a, b);
}

function isSubsetOf(a, b) {
  a = a instanceof Set ? a : new Set(a);
  b = b instanceof Set ? b : new Set(b);
  return equal(union(b, a), b);
}

function isStrictSupersetOf(a, b) {
  a = a instanceof Set ? a : new Set(a);
  b = b instanceof Set ? b : new Set(b);
  return a.size > b.size && isSupersetOf(a, b);
}

function isSupersetOf(a, b) {
  a = a instanceof Set ? a : new Set(a);
  b = b instanceof Set ? b : new Set(b);
  return equal(union(a, b), a);
}

module.exports = {
  addToSet,
  union,
  intersection,
  difference,
  equal,
  disjunctiveUnion,
  isSubsetOf,
  isStrictSubsetOf,
  isSupersetOf,
  isStrictSupersetOf,
};
