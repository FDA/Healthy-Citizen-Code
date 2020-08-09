/**
 * Implements endpoints for questionnaire widget
 * @returns {{}}
 */
module.exports = function (globalMongoose) {
  const fs = require('fs');
  const _ = require("lodash");
  const async = require('async');
  const crypto = require('crypto');
  const {exec} = require('child_process');
  const log = require('log4js').getLogger('research-app-model/questionnaire-controller');
  const ObjectID = require('mongodb').ObjectID;

  const mongoose = globalMongoose;

  let m = {};

  let getRandomString = () => {
    return crypto.createHash('md5').update(("" + Date.now() + Math.random() * 1000)).digest("hex").substr(4, 24);
  };

  m.init = (appLib) => {
    m.appLib = appLib;
    appLib.addRoute('post', `/questionnaires`, [appLib.isAuthenticated, m.postQuestionnaire]);
    appLib.addRoute('put', `/questionnaires/:id`, [appLib.isAuthenticated, m.putQuestionnaire]);
    appLib.addRoute('get', `/questionnaire-by-fhirid/:id`, [m.getQuestionnaireByFhirId]); // TODO: secure with OAuth
    appLib.addRoute('post', `/questionnaire-by-fhirid/:id`, [m.postQuestionnaireAnswers]); // TODO: secure with OAuth
    appLib.addRoute('get', `/questionnaires-answers`, [m.getQuestionnaireAnswers]);
  };

  let updateQuestionnaire = (req, res, cb) => {
    let tmpfile = getRandomString() + '.json';
    let uploaded_file_id = _.get(req, "body.data.questionnaireDefinitionFile.0.id");
    mongoose.model('files').findById(uploaded_file_id, (err, data) => {
      if (err) {
        log.error(err);
        res.json({success: false, message: 'Unable to find file record'});
      }
      if (!data) {
        log.error('Unable to find file record');
        res.json({success: false, message: 'Unable to find file record'});
      } else {
        // TODO: this is a very hacky way to convert .xls into .json. Use web service in the final version
        let cmd = `cd ../hc-data-bridge && cp ../${data.filePath} /tmp/${tmpfile}.xls && node generateAppModelByFile.js --inputFilePath=/tmp/${tmpfile}.xls --backendMetaschema --outputModelPath=/tmp/${tmpfile} && echo "-----------CUTLINE---------" &&cat /tmp/${tmpfile}`;
        exec(cmd, (err, stdout, stderr) => { //
          if (err) {
            res.json({success: false, message: 'Unable to process the .xls file'});
          } else {
            let questionsDefinition = stdout.replace(/[\s\S]*-----------CUTLINE---------/m, '');
            req.body.data.questionnaireDefinition = JSON.parse(questionsDefinition);
            cb(req, res, cb);
          }
        });
      }
    });
  };

  m.postQuestionnaire = (req, res, next) => {
    updateQuestionnaire(req, res, m.appLib.mainController.postItem);
  };

  m.putQuestionnaire = (req, res, next) => {
    updateQuestionnaire(req, res, m.appLib.mainController.putItem);
  };

  m.getQuestionnaireByFhirId = (req, res, next) => {
    let fhirId = req.params.id || '';
    mongoose.model('questionnaires').aggregate([
      {
        $project: {
          _id: 1,
          pools: 1,
          questionnaireName: 1,
          questionnaireDescription: 1,
          questionnaireDefinition: 1,
          participants: 1
        }
      },
      {$unwind: "$pools"},
      {$lookup: {from: "pools", localField: "pools", "foreignField": "_id", "as": "pools"}},
      {$unwind: "$pools"},
      {
        $lookup: {
          from: "poolparticipants",
          localField: "pools._id",
          "foreignField": "poolId",
          "as": "poolParticipants"
        }
      },
      {$unwind: "$poolParticipants"},
      {$match: {"poolParticipants.guid": fhirId}},
      {
        $lookup: {
          from: "participants",
          localField: "poolParticipants.guid",
          "foreignField": "guid",
          "as": "participants"
        }
      },
      {$unwind: "$participants"},
      {$unwind: {"path": "$participants.answersToQuestionnaires", "preserveNullAndEmptyArrays": true}},
      {
        $group: {
          _id: '$_id',
          answeredQuestionnaireIds: {$addToSet: "$participants.answersToQuestionnaires.questionnaireId"},
          questionnaireDescription: {$first: '$questionnaireDescription'},
          questionnaireDefinition: {$first: '$questionnaireDefinition'}
        }
      },
      {"$addFields": {isQuestionAnswered: {$in: ["$_id", "$answeredQuestionnaireIds"]}}},
      {$match: {isQuestionAnswered: false}},
      {$limit: 1}
    ], (err, data) => {
      if (err) {
        res.json({success: false, message: 'Unable to retrieve the questionnaire'});
      } else if (!data || data.length < 1) {
        res.json({success: true, message: 'No questionnaires available for this participant'});
      } else {
        let q = data[0];
        res.json({
          success: true, data: {
            _id: q._id,
            questionnaireName: q.questionnaireName,
            questionnaireDescription: q.questionnaireDescription,
            questionnaireDefinition: q.questionnaireDefinition
          }
        });
      }
    });
  };

  /**
   * Post data as req.data = {questionnaireId: ObjectID, answers: {questionId: answer}}
   * @param req
   * @param res
   * @param next
   */
  m.postQuestionnaireAnswers = (req, res, next) => {
    let fhirId = req.params.id;
    mongoose.model('participants').update({guid: fhirId}, {
      $push: {
        answersToQuestionnaires: {
          questionnaireId: new ObjectID(req.body.data.questionnaireId),
          answers: req.body.data.answers
        }
      }
    }, (err, data) => {
      if (err) {
        res.json({success: false, message: 'Unable to post the answer'});
      } else if (!data || data.nModified === 0) {
        res.json({success: false, message: 'Participant with this FHIR ID not found'});
      } else {
        res.json({success: true, message: 'Your answers have been recorded'});
      }
    });
  };

  m.getQuestionnaireAnswers = (req, res, next) => {
    mongoose.model('participants').aggregate([
      {$match: {'answersToQuestionnaires': {$ne: null}}},
      {$unwind: '$answersToQuestionnaires'},
      {
        $group: {
          _id: {
            questionnaireId: "$answersToQuestionnaires.questionnaireId",
            guid: "$guid"
          },
          answers: {$first: "$answersToQuestionnaires.answers"}
        }
      },
      {
        $lookup: {
          from: "questionnaires",
          localField: "_id.questionnaireId",
          foreignField: "_id",
          as: "questionnaire"
        }
      },
      {$unwind: '$questionnaire'},
      {
        $project: {
          _id : 0,
          questionnaireId: '$_id.questionnaireId',
          guid: '$_id.guid',
          questionnaireDescription: '$questionnaire.questionnaireDescription',
          questionnaireName: '$questionnaire.questionnaireName',
          questionnaire: '$questionnaire.questionnaireDefinition.questionnaire',
          answers: '$answers'
        }
      }
    ], (err, data) => {
      if (err) {
        res.json({success: false, message: 'Unable to get the questionnaire answers'});
      } else {
        const results = [];
        _.forEach(data, value => {
          const valueToClone = _.clone(value);
          delete valueToClone.answers;
          delete valueToClone.questionnaire;

          _.forEach(value.answers, (answer, questionnaireKey) => {
            // map question to answer
            if (value.questionnaire[questionnaireKey]) {
              value.questionnaire[questionnaireKey].answer = value.answers[questionnaireKey];
            }
            // unwind each question-answer pair in questionnaire to separate object
            const newVal = _.clone(valueToClone);
            _.set(newVal, ['questionnaire', questionnaireKey], value.questionnaire[questionnaireKey]);
            results.push(newVal);
          });
        });
        res.json({success: true, data: results});
      }
    });
  };

  return m;
};
