const DEFAULT_PAGE_SIZE = 100;
const Promise = require("bluebird");
const rp = require("request-promise");
const _ = require("lodash");
const ObjectID = require("mongodb").ObjectID;

module.exports = function (/*globalMongoose*/) {
  let m = {};

  m.init = (appLib) => {
    m.appLib = appLib;
    m.appLib.addRoute("get", `/normalize-ndc/:ndc`, [m.getNormalizeNdc]);
    m.appLib.addRoute("get", `/get-drug-info-by-ndc-code/:ndc`, [
      m.getDrugInfoByNdcCode,
    ]);
    m.appLib.addRoute("get", `/get-drug-info/:id`, [m.getMedicationDocById]);
    m.appLib.addRoute("get", `/get-drug-info-by-match-predictive`, [
      m.getDrugByMatchPredictive,
    ]);

    const medicationMaster = appLib.db.collection("medicationMaster");

    return Promise.all([
      medicationMaster.createIndex({ ndc11: 1 }),
      medicationMaster.createIndex({ srcNdc: 1 }),
      medicationMaster.createIndex({ brandName: 1 }),
      medicationMaster.createIndex({ genericNames: 1 }),
    ]);
  };

  m.getVFormat = (v_ndc) => {
    // this is to be moved into an npm
    if (!_.isString(v_ndc)) {
      return null;
    }

    let currentNotDashCharsCount = 0;
    const notDashCharsCounts = []; // example [6,4,2]
    for (let i = 0; i < v_ndc.length; i++) {
      if (v_ndc[i] === "-") {
        notDashCharsCounts.push(currentNotDashCharsCount);
        currentNotDashCharsCount = 0;
        continue;
      }
      currentNotDashCharsCount++;
    }
    if (currentNotDashCharsCount !== 0) {
      notDashCharsCounts.push(currentNotDashCharsCount);
    }

    return notDashCharsCounts.join("-");
  };

  m.getNormalizedNdc = (v_ndc) => {
    // this is to be moved into an npm
    let ret_ndc; // string(50);    'the normalized NDC
    let v_format; // string(50);  'the format of source NDC code

    v_format = m.getVFormat(v_ndc);

    if (v_format === "6-4-2") {
      // drop first digit of string
      const omitDashesNDC = v_ndc.replace("-", "");
      ret_ndc = omitDashesNDC.substring(1);
    } else if (v_format === "6-4-1") {
      ret_ndc = `${v_ndc.substr(1, 5) + v_ndc.substr(7, 4)}0${v_ndc.substr(
        12,
        1
      )}`;
    } else if (v_format === "6-3-2") {
      ret_ndc = `${v_ndc.substr(1, 5)}0${v_ndc.substr(7, 3)}${v_ndc.substr(
        11,
        2
      )}`;
    } else if (v_format === "6-3-1") {
      ret_ndc = `${v_ndc.substr(1, 5)}0${v_ndc.substr(7, 3)}0${v_ndc.substr(
        11,
        1
      )}`;
    } else if (v_format === "5-4-2") {
      ret_ndc = v_ndc.substr(0, 5) + v_ndc.substr(6, 4) + v_ndc.substr(11, 2);
    } else if (v_format === "5-4-1") {
      ret_ndc = `${v_ndc.substr(0, 5) + v_ndc.substr(6, 4)}0${v_ndc.substr(
        11,
        1
      )}`;
    } else if (v_format === "5-3-2") {
      ret_ndc = `${v_ndc.substr(0, 5)}0${v_ndc.substr(6, 3)}${v_ndc.substr(
        10,
        2
      )}`;
    } else if (v_format === "4-4-2") {
      ret_ndc = `0${v_ndc.substr(0, 4)}${v_ndc.substr(5, 4)}${v_ndc.substr(
        10,
        2
      )}`;
    } else if (v_format === "11") {
      ret_ndc = v_ndc;
    } else if (v_format === "12" && v_ndc.substr(0, 1) === "0") {
      ret_ndc = v_ndc.substr(1, 11);
    } else {
      // For any other cases, return NULL.  String cannot be normalized
      return null;
    }

    //  Replace '*' with '0' as some of the NDCs from MTHFDA contain * instead of 0
    ret_ndc = ret_ndc.replace(/\*/g, "0");

    //  Check to see if NDC value contains any Alphanumeric values, if yes, then its an invalid NDC code
    if (ret_ndc.match(/\D/g) !== null) {
      return "";
    }
    return ret_ndc;
  };

  m.getDrugInfoByNdcCode = (req, res, next) => {
    let ndc, rxcui, name, names;
    new Promise((resolve, reject) => {
      ndc = m.getNormalizedNdc(req.params.ndc);
      if (ndc) {
        resolve();
      } else {
        reject("Unable to normalize this input");
      }
    })
      .then(() => {
        return rp(
          `https://rxnav.nlm.nih.gov/REST/ndcproperties.json?id=${ndc}`
        );
      })
      .then((res1) => {
        if (res1 === "null") {
          throw `Medication with NDC ${ndc} is not found.`;
        }

        let res1obj = JSON.parse(res1);
        rxcui = _.get(res1obj, "ndcPropertyList.ndcProperty.0.rxcui");
        if (rxcui === "null") {
          throw "RxNAV response doesn't contain RxCUI code";
        }
      })
      .then(() => {
        return rp(
          `https://rxnav.nlm.nih.gov/REST/rxcui/${rxcui}/allProperties.json?prop=all`
        );
      })
      .then((res2) => {
        let res2obj = JSON.parse(res2);
        name = _.chain(res2obj)
          .get("propConceptGroup.propConcept")
          .filter({ propCategory: "NAMES", propName: "RxNorm Name" })
          .map("propValue")
          .first()
          .value();
        names = _.chain(res2obj)
          .get("propConceptGroup.propConcept")
          .filter({ propCategory: "NAMES" })
          .map("propValue")
          .value();
      })
      .then(() => {
        res.json({
          success: true,
          data: {
            ndc: ndc,
            rxcui: rxcui,
            name: name,
            names: names,
          },
        });
      })
      .catch((e) => {
        console.log(
          `Error occurred while searching drug info  by ndc code '${req.params.ndc}'`,
          e.stack
        );
        res.json({
          success: false,
          message: `Unable to find information: ${e}`,
        });
      })
      .finally(() => next());
  };

  m.getNormalizeNdc = (req, res, next) => {
    let ret = m.getNormalizedNdc(req.params.ndc);
    if (ret) {
      res.json({ success: true, data: { normalizedNdc: ret } });
    } else {
      res.json({ success: false, message: "Unable to normalize this input" });
    }
    next();
  };

  function getPredictiveSearchMongoCondition(match) {
    const condition = {
      brandName: { $exists: true },
      rxnsatData: { $exists: true },
      $or: [],
    };
    const regex = new RegExp(`${_.escapeRegExp(match)}`, "i");
    const brandNameCondition = { brandName: { $regex: regex } };
    const genericNamesCondition = { genericNames: { $regex: regex } };
    condition.$or.push(brandNameCondition, genericNamesCondition);

    const ndc11Condition = { ndc11: { $regex: regex } };
    const notNormalizedNdcCondition = { srcNdc: { $regex: regex } };
    const isPossibleNDC11 = match.split().every((c) => /[\d-]/.test(c));
    isPossibleNDC11 &&
      condition.$or.push(ndc11Condition, notNormalizedNdcCondition);
    return condition;
  }

  m.getDrugByMatchPredictive = (req, res, next) => {
    const match = req.query.q;
    const condition = getPredictiveSearchMongoCondition(match);

    const limit = Math.min(
      parseInt(req.query.limit) || DEFAULT_PAGE_SIZE,
      DEFAULT_PAGE_SIZE
    );
    const page = Math.max(parseInt(req.query.page), 1);

    const skip = (page - 1) * limit;

    const medicationMaster = m.appLib.db.collection("medicationMaster");
    medicationMaster
      .find(condition, { limit, skip })
      .then((result) => {
        res.json({ success: true, data: result });
        next();
      })
      .catch((err) => {
        console.log(
          `Error occurred while searching for drug by match '${match}'`,
          err.stack
        );
        res.json(400, {
          success: false,
          message: `Internal error: Unable to get drug by match ${match}`,
        });
      });
  };

  m.getMedicationDocById = (req, res, next) => {
    if (!ObjectID.isValid(req.params.id)) {
      return res.json(400, { success: false, message: `Invalid id format` });
    }
    const docId = ObjectID(req.params.id);

    const medicationMaster = m.appLib.db.collection("medicationMaster");
    const medicationsOpenFda = m.appLib.db.collection("medicationsopenfda");

    let medicationMasterDoc;
    medicationMaster
      .findOne({ _id: docId })
      .then((result) => {
        if (!result) {
          return Promise.reject({ code: "notFound" });
        }
        medicationMasterDoc = result;
        return medicationsOpenFda.findOne({
          _id: medicationMasterDoc.openFdaData.id,
        });
      })
      .then((medicationsOpenFdaDoc) => {
        const packageLabels =
          medicationsOpenFdaDoc.rawData.package_label_principal_display_panel;
        medicationMasterDoc.openFdaData.packageLabels = packageLabels;
        res.json({ success: true, data: medicationMasterDoc });
      })
      .catch({ code: "notFound" }, (err) => {
        res.json(404, { success: false, message: `Medication not found` });
      })
      .catch((err) => {
        console.log(
          `Error occurred while searching for drug info by id '${req.params.id}'`,
          err.stack
        );
        res.json(400, {
          success: false,
          message: `Internal error: Unable to get medication`,
        });
      });
  };

  return m;
};
