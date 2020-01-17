const _ = require('lodash');

function getVFormat(v_ndc) {
  if (!_.isString(v_ndc)) {
    return null;
  }

  let currentNotDashCharsCount = 0;
  const notDashCharsCounts = []; // example [6,4,2]
  for (let i = 0; i < v_ndc.length; i++) {
    if (v_ndc[i] === '-') {
      notDashCharsCounts.push(currentNotDashCharsCount);
      currentNotDashCharsCount = 0;
      continue;
    }
    currentNotDashCharsCount++;
  }
  if (currentNotDashCharsCount !== 0) {
    notDashCharsCounts.push(currentNotDashCharsCount);
  }

  return notDashCharsCounts.join('-');
}

function getNormalizedNDC(record) {
  if (!_.isObject(record) || record.ATN !== 'NDC') {
    return null;
  }
  const v_ndc = record.ATV; // value of source NDC to be normalized
  const v_rsab = record.SAB; // RxNorm root source abbreviation (SAB)
  let ret_ndc; // string(50);    'the normalized NDC
  let v_format; // string(50);  'the format of source NDC code

  v_format = getVFormat(v_ndc);

  if (v_format === '6-4-2') {
    // drop first digit of string
    const omitDashesNDC = v_ndc.replace('-', '');
    ret_ndc = omitDashesNDC.substring(1);
  } else if (v_format === '6-4-1') {
    ret_ndc = `${v_ndc.substr(1, 5) + v_ndc.substr(7, 4)}0${v_ndc.substr(12, 1)}`;
  } else if (v_format === '6-3-2') {
    ret_ndc = `${v_ndc.substr(1, 5)}0${v_ndc.substr(7, 3)}${v_ndc.substr(11, 2)}`;
  } else if (v_format === '6-3-1') {
    ret_ndc = `${v_ndc.substr(1, 5)}0${v_ndc.substr(7, 3)}0${v_ndc.substr(11, 1)}`;
  } else if (v_format === '5-4-2') {
    ret_ndc = v_ndc.substr(0, 5) + v_ndc.substr(6, 4) + v_ndc.substr(11, 2);
  } else if (v_format === '5-4-1') {
    ret_ndc = `${v_ndc.substr(0, 5) + v_ndc.substr(6, 4)}0${v_ndc.substr(11, 1)}`;
  } else if (v_format === '5-3-2') {
    ret_ndc = `${v_ndc.substr(0, 5)}0${v_ndc.substr(6, 3)}${v_ndc.substr(10, 2)}`;
  } else if (v_format === '4-4-2') {
    ret_ndc = `0${v_ndc.substr(0, 4)}${v_ndc.substr(5, 4)}${v_ndc.substr(10, 2)}`;
  } else if (v_format === '11') {
    ret_ndc = v_ndc;
  } else if (v_format === '12' && v_ndc.substr(0, 1) === '0' && v_rsab === 'VANDF') {
    ret_ndc = v_ndc.substr(1, 11);
  } else {
    // For any other cases, return NULL.  String cannot be normalized
    return null;
  }

  //  Replace '*' with '0' as some of the NDCs from MTHFDA contain * instead of 0
  ret_ndc = ret_ndc.replace(/\*/g, '0');

  //  Check to see if NDC value contains any Alphanumeric values, if yes, then its an invalid NDC code
  if (ret_ndc.match(/\D/g) !== null) {
    return '';
  }
  return ret_ndc;
}

function getNormalizedNDCByPackageNDC(packageNdc) {
  return getNormalizedNDC({ ATV: packageNdc, ATN: 'NDC' });
}

// More info: https://www.idmedicaid.com/Reference/NDC%20Format%20for%20Billing%20PAD.pdf
function getProductCodeByNdc11(ndc11) {
  if (ndc11[0] === '0') {
    return `${ndc11.substr(1, 4)}${ndc11.substr(5, 4)}`;
  }
  if (ndc11[5] === '0') {
    return `${ndc11.substr(0, 5)}${ndc11.substr(6, 3)}`;
  }
  if (ndc11[9] === '0') {
    return `${ndc11.substr(0, 9)}`;
  }
}

function getProductCodeByProductCodeWithDash(productCodeWithDash) {
  const [part1, part2] = productCodeWithDash.split('-');
  const p1L = part1.length;
  const p2L = part2.length;
  if (p1L === 4 && p2L === 4) {
    return `0${part1}${part2}`;
  }
  if (p1L === 5 && p2L === 3) {
    return `${part1}0${part2}`;
  }
  return part1 + part2;
}

module.exports = {
  getNormalizedNDC,
  getNormalizedNDCByPackageNDC,
  getProductCodeByNdc11,
  getProductCodeByProductCodeWithDash,
};
