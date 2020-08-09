// const PiiData = require('../models/pii_data')
//     , modelFieldsValidator = require('./../validators/model_fields_validator');

// /**
//  * GET /api/piidata
//  * Login page.
//  */
// exports.piiDataList = (req, res) => {
  
//   var promise = PiiData.findOne({email: req.decoded.email}).lean().exec();

//   promise
//     .then(piiData => {
//       if (piiData === null) {
//         return res.json(201, {error: "Pii not found"});
//       }

//       piiData = PiiData.normalize(piiData);
//       res.json(piiData)
//     }, err => {
//       console.log(err);
//       res.json(err);
//     });
// };

// /**
//  * GET /api/piidata/:id
//  * Login page.
//  */
// exports.piiDataRead = (req, res) => {
//   var _id = req.params.id;

//   var promise = PiiData.findById(_id).lean().exec();
//   promise
//     .then(function(piiData){
//       piiData = PiiData.normalize(piiData);
//       res.json(piiData);
//     })
//     .catch(function(err){
//       res.json({
//         code: 500,
//         error: err
//       });
//     });
// };

// /**
//  * POST /api/piidata
//  * Create piiData
//  */
// exports.piiDataCreate = (req, res) => {
//   const piiDataJSON = req.body;
//   const validatedUPii = modelFieldsValidator.validate(PiiData.getModel(), piiDataJSON);
//   let piiData = new PiiData(validatedUPii);
  
//   piiData.save(function(err){
//     if (err){
//       res.json(err);
//     }
//   });

//   res.json(piiData);
// };

// /**
//  * PUT /api/piidata/:id
//  * Update piiData.
//  */
// exports.piiDataUpdate = (req, res) => {
//   var id = req.params.id;

//   res.json({
//     name: 'piiDataUpdate',
//     id: id
//   });

// };

// /**
//  * DELETE /api/piidata/:id
//  * remove piiData
//  */
// exports.piiDataDelete = (req, res) => {
//   var id = req.params.id;

//   res.json(200, {
//     name: 'piiDataDelete',
//     id: id
//   });

// };

// /**
//  * GET /api/piidata/by-email/:email
//  * remove phiData
//  */
// exports.piiFindByEmail = (req, res) => {
//   var email = req.params.email;
  
//   var promise = PiiData.findOne({email: email}).lean().exec();

//   promise
//     .then(piiData => {
//       if (piiData === null) {
//         return res.json(200, null)
//       }
//       piiData = PiiData.normalize(piiData);
//       return res.json(200, piiData);
//     })
//     .catch((err) => {
//       return res.json(500, {
//         code: 500,
//         error: err
//       });
//     });
// }
