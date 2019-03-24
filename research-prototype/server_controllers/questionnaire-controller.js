/**
 * Implements endpoints for questionnaire widget
 * @returns {{}}
 */
module.exports = function (globalMongoose) {
  const _ = require("lodash");
  const crypto = require('crypto');
  const { exec } = require('child_process');
  const log = require('log4js').getLogger('research-app-model/questionnaire-controller');
  const questionnaireStatuses = require('../helpers/questionnaire_helper').statuses;

  const mongoose = globalMongoose;

  const m = {};

  const getRandomString = () => {
    return crypto.createHash('md5').update(("" + Date.now() + Math.random() * 1000)).digest("hex").substr(4, 24);
  };

  m.init = (appLib) => {
    m.appLib = appLib;
    appLib.addRoute('post', `/questionnaires`, [appLib.isAuthenticated, m.postQuestionnaire]);
    appLib.addRoute('put', `/questionnaires/:id`, [appLib.isAuthenticated, m.putQuestionnaire]);
    appLib.addRoute('get', `/questionnaire-by-fhirid/:id`, [m.getQuestionnaireByFhirId]); // TODO: secure with OAuth
    appLib.addRoute('post', `/questionnaire-by-fhirid/:id`, [m.postQuestionnaireAnswers]); // TODO: secure with OAuth
    appLib.addRoute('post', `/start-questionnaire/:id`, [m.startQuestionnaire]);
    appLib.addRoute('get', `/questionnaires-answers`, [appLib.isAuthenticated, m.getQuestionnaireAnswers]);
  };

  const updateQuestionnaire = (req, res, cb, next) => {
    const tmpfile = getRandomString() + '.json';
    const uploadedFileId = _.get(req, "body.data.questionnaireDefinitionFile.0.id");
    mongoose.model('files').findById(uploadedFileId, (err, data) => {
      if (err) {
        log.error(err);
        res.json({success: false, message: 'Unable to find file record'});
      }
      if (!data) {
        log.error('Unable to find file record');
        res.json({success: false, message: 'Unable to find file record'});
      } else {
        // TODO: this is a very hacky way to convert .xls into .json. Use web service in the final version
        const cmd = `cp ${data.filePath} /tmp/${tmpfile}.xls && cd ../hc-data-bridge && node generateAppModelByFile.js --inputFilePath=/tmp/${tmpfile}.xls --backendMetaschema --outputModelPath=/tmp/${tmpfile} && echo "-----------CUTLINE---------" &&cat /tmp/${tmpfile}`;
        exec(cmd, (err, stdout, stderr) => { //
          if (err) {
            res.json({success: false, message: 'Unable to process the .xls file', err: err});
          } else {
            const questionsDefinition = stdout.replace(/[\s\S]*-----------CUTLINE---------/m, '');
            req.body.data.questionnaireDefinition = JSON.parse(questionsDefinition);
            cb(req, res, next);
          }
        });
      }
    });
  };

  m.postQuestionnaire = (req, res, next) => {
    updateQuestionnaire(req, res, m.appLib.controllers.main.postItem, next);
  };

  m.putQuestionnaire = (req, res, next) => {
    updateQuestionnaire(req, res, m.appLib.controllers.main.putItem, next);
  };

  function getInProgressQuestionnaire(fhirId) {
    const pipeline = [
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
      {$lookup: {from: "pools", localField: "pools._id", "foreignField": "_id", "as": "pools"}},
      {$unwind: "$pools"},
      {
        $lookup: {
          from: "poolParticipants",
          localField: "pools._id",
          "foreignField": "poolId._id",
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
      {"$addFields": {isQuestionIdMatched: {$eq: ["$_id", "$participants.answersToQuestionnaires.questionnaireId._id"]}}},
      {
        $match: {
          $and: [
            {'isQuestionIdMatched': true},
            {'participants.answersToQuestionnaires.status': {$eq: questionnaireStatuses.inProgress}}
          ],
        }
      },
      {$limit: 1},
      {
        $project:
          {
            'questionnaireName': 1,
            'status': '$participants.answersToQuestionnaires.status',
            'questionnaireDescription': 1,
            'questionnaireDefinition': 1
          }
      }
    ];
    return mongoose.model('questionnaires').aggregate(pipeline).then(inProgressQuestionnaires => {
      if (!_.isEmpty(inProgressQuestionnaires)) {
        return inProgressQuestionnaires[0];
      }
    });
  }

  function getNotStartedQuestionnaire(fhirId) {
    const pipeline = [
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
        {$lookup: {from: "pools", localField: "pools._id", "foreignField": "_id", "as": "pools"}},
        {$unwind: "$pools"},
        {
            $lookup: {
                from: "poolParticipants",
                localField: "pools._id",
                "foreignField": "poolId._id",
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
                startedQuestionnaires: {$addToSet: "$participants.answersToQuestionnaires.questionnaireId._id"},
                questionnaireDescription: {$first: '$questionnaireDescription'},
                questionnaireDefinition: {$first: '$questionnaireDefinition'},
                questionnaireName: {$first: '$questionnaireName'}
            }
        },
        {"$addFields": {isQuestionnaireStarted: {$in: ["$_id", "$startedQuestionnaires"]}}},
        {$match: { isQuestionnaireStarted: false } },
        {$limit: 1},
        {
            $project:
                {
                    'questionnaireName': 1,
                    'status': questionnaireStatuses.notStarted,
                    'questionnaireDescription': 1,
                    'questionnaireDefinition': 1
                }
        }
    ];

    return mongoose.model('questionnaires').aggregate(pipeline).then(notStartedQuestionnaires => {
      if (!_.isEmpty(notStartedQuestionnaires)) {
        return notStartedQuestionnaires[0];
      }
      return null;
    });
  }

  m.getQuestionnaireByFhirId = (req, res, next) => {
    const fhirId = req.params.id || '';
    return getInProgressQuestionnaire(fhirId)
      .then(inProgressQuestionnaire => {
        if (inProgressQuestionnaire) {
          return inProgressQuestionnaire;
        }
        return getNotStartedQuestionnaire(fhirId);
      }).then(questionnaire => {
        if (!questionnaire) {
          return res.json({success: false, message: 'No questionnaires available for this participant'});
        }
        return res.json({
          success: true,
          data: _.pick(questionnaire, [
            '_id',
            'status',
            'questionnaireName',
            'questionnaireDescription',
            'questionnaireDefinition',
          ])
        });
      }).catch(err => {
        log.error(err);
        return res.json({success: false, message: 'Unable to retrieve any questionnaires for this participant'});
      })
  };

  /**
   * Post data as req.data = {questionnaireId: ObjectID, answers: {questionId: answer}}
   * @param req
   * @param res
   * @param next
   */

  class QuestionnaireError extends Error {
    constructor(m) {
      super(m);
    }
  }

  m.postQuestionnaireAnswers = (req, res, next) => {
    const fhirId = req.params.id;
    const questionnaireId = _.get(req, 'body.data.questionnaireId');
    if (!questionnaireId || !mongoose.Types.ObjectId.isValid(questionnaireId)) {
      return res.json({success: false, message: 'Invalid data.questionnaireId. It should be a string represented as valid ObjectID.'});
    }
    const questionnaireObjectId = mongoose.Types.ObjectId(questionnaireId);

    mongoose.model('participants').findOne({
      guid: fhirId,
      'answersToQuestionnaires.questionnaireId._id': questionnaireObjectId
    })
      .then(participant => {
        if (!participant) {
          throw new QuestionnaireError('Questionnaire not found for specified participant.');
        }
        const answersToQIndex = participant.answersToQuestionnaires
          .findIndex(answersToQ => answersToQ.questionnaireId._id.toString() === questionnaireId);
        const answersToQ = participant.answersToQuestionnaires[answersToQIndex];

        if (answersToQ.get('endTime')) {
          throw new QuestionnaireError('Cannot post answers for completed questionnaire.');
        }
        const startTime = answersToQ.get('startTime');
        if (!startTime) {
          throw new QuestionnaireError('Cannot post answers for not started questionnaire.');
        }

        const dbAnswers = answersToQ.answers || {};
        const clientAnswers = _.get(req, 'body.data.answers', {});
        const newAnswers = _.merge(dbAnswers, clientAnswers);
        answersToQ.set('answers', newAnswers);
        answersToQ.set('status', questionnaireStatuses.inProgress);

        // calculate spent time
        const isCompleted = req.body.data.isCompleted;
        if (isCompleted) {
          const endTime = new Date();
          const spentTimeInSeconds = parseInt(0.001 * (endTime.getTime() - new Date(startTime).getTime()), 10);

          answersToQ.set('endTime', endTime);
          answersToQ.set('spentTime', spentTimeInSeconds);
          answersToQ.set('status', questionnaireStatuses.completed);
        }

        participant.markModified(`answersToQuestionnaires.${answersToQIndex}`);
        return participant.save((err, doc) => {
          if (err) {
            return res.json({success: false, message: 'Unable to post the answer'});
          }
          res.json({success: true, message: 'Your answers have been recorded'});
        });
      })
      .catch(err => {
        log.error(err);
        if (err instanceof QuestionnaireError) {
          return res.json({success: false, message: err.message});
        }
        res.json({success: false, message: err.message});
      });
  };

  m.startQuestionnaire = (req, res, next) => {
    const fhirId = req.params.id;
    const questionnaireId = _.get(req, 'body.data.questionnaireId');
    if (!questionnaireId || !mongoose.Types.ObjectId.isValid(questionnaireId)) {
      return res.json({success: false, message: 'Invalid data.questionnaireId. It should be a string represented as valid ObjectID.'});
    }
    const questionnaireObjectID = mongoose.Types.ObjectId(questionnaireId);
    return mongoose.model('participants').findOne({ guid: fhirId})
      .then(participant => {
        if (!participant) {
          throw new QuestionnaireError(`Unable to find participant with De-Identified ID: '${fhirId}'`);
        }
        return mongoose.model('participants')
          .update({ guid: fhirId, 'answersToQuestionnaires.questionnaireId._id': { $exists: false } }, {
            $addToSet: { // TODO: mongoose runs this query twice, possibly because of this: https://stackoverflow.com/questions/36822745/node-workaround-for-mongoose-pushing-twice-after-saving-twice, replaced with $addToSet. Need to get rid of Mongoose
              answersToQuestionnaires: {
                questionnaireId: {
                  label: questionnaireId, // not real
                  table: "questionnaires",
                  _id: questionnaireObjectID
                },
                status: questionnaireStatuses.inProgress,
                startTime: new Date(),
              }
            }
          })
      })
      .then(data => {
        const {nModified} = data;
        if (nModified === 1 ) {
          return res.json({ success: true, message: 'Your questionnaire is started' });
        }
        if (nModified === 0) {
          return res.json({ success: false, message: 'Cannot start already started questionnaire.' });
        }
      })
      .catch(err => {
        log.error(err.stack);
        if (err instanceof QuestionnaireError) {
          return res.json({success: false, message: err.message});
        }
        res.json({success: false, message: 'Unable to start questionnaire'});
      });
  };

  m.getQuestionnaireAnswers = (req, res, next) => {
    const pipeline = [
        {$match: {'answersToQuestionnaires': {$ne: null}}},
        {$unwind: '$answersToQuestionnaires'},
        {
            $group: {
                _id: {
                    questionnaireId: "$answersToQuestionnaires.questionnaireId._id",
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
                _id: 0,
                questionnaireId: '$_id.questionnaireId',
                guid: '$_id.guid',
                questionnaireDescription: '$questionnaire.questionnaireDescription',
                questionnaireName: '$questionnaire.questionnaireName',
                questionnaire: '$questionnaire.questionnaireDefinition.Questionnaire',
                answers: '$answers'
            }
        }
    ];

    mongoose.model('participants').aggregate(pipeline, (err, data) => {
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
