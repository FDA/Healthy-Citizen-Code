/**
 * Implements endpoints for questionnaire widget
 * @returns {{}}
 */
module.exports = function (globalMongoose) {
  const Promise = require('bluebird');
  const JSON5 = require('json5');
  const _ = require('lodash');
  const crypto = require('crypto');
  const exec = Promise.promisify(require('child_process').exec);
  const log = require('log4js').getLogger('research-app-model/questionnaire-controller');
  const questionnaireStatuses = require('../helpers/questionnaire_helper').statuses;

  const mongoose = globalMongoose;

  const m = {};

  const getRandomString = () => {
    return crypto
      .createHash('md5')
      .update(`${Date.now()}${Math.random() * 1000}`)
      .digest('hex')
      .substr(4, 24);
  };

  m.init = (appLib) => {
    m.appLib = appLib;
    const { wrapMutation } = m.appLib.graphQl;
    const { ValidationError } = m.appLib.errors;

    m.conditionForActualRecord = m.appLib.dba.getConditionForActualRecord();

    const parseQuestionnaireFileWrapper = (next) => async (rp) => {
      try {
        const tmpfile = `${getRandomString()}.json`;
        const uploadedFileId = _.get(rp.args.record, 'questionnaireDefinitionFile.0.id');

        const data = await mongoose.model('files').findById(uploadedFileId).lean().exec();
        if (!data) {
          throw new ValidationError('Unable to find questionnaire file');
        }

        // TODO: this is a very hacky way to convert .xls into .json. Use web service in the final version
        const cmd = `cp ${data.filePath} /tmp/${tmpfile}.xls && cd ../hc-data-bridge && node generateAppModelByFile.js --inputFilePath=/tmp/${tmpfile}.xls --backendMetaschema --outputModelPath=/tmp/${tmpfile} && echo "-----------CUTLINE---------" &&cat /tmp/${tmpfile}`;
        const stdout = await exec(cmd);

        const questionsDefinition = stdout.replace(/[\s\S]*-----------CUTLINE---------/m, '');
        const questionnaireDefinition = JSON5.parse(questionsDefinition);
        const questionnaire = _.reduce(
          questionnaireDefinition,
          (acc, sheetData) => {
            _.merge(acc, sheetData);
            return acc;
          },
          {}
        );

        _.set(rp.args.record, 'questionnaireDefinition.questionnaire', questionnaire);
      } catch (e) {
        if (e instanceof ValidationError) {
          throw e;
        }
        log.error(e.stack);
        throw new Error('Unable to process questionnaire file');
      }
      return next(rp);
    };
    wrapMutation('questionnairesCreate', parseQuestionnaireFileWrapper);
    wrapMutation('questionnairesUpdateOne', parseQuestionnaireFileWrapper);

    appLib.addRoute('get', `/questionnaire-by-fhirid/:id`, [m.getQuestionnaireByFhirId]); // TODO: secure with OAuth
    appLib.addRoute('post', `/questionnaire-by-fhirid/:id`, [m.postQuestionnaireAnswers]); // TODO: secure with OAuth
    appLib.addRoute('post', `/start-questionnaire/:id`, [m.startQuestionnaire]);
    appLib.addRoute('get', `/questionnaires-answers`, [appLib.isAuthenticated, m.getQuestionnaireAnswers]);
  };

  async function getInProgressQuestionnaire(fhirId) {
    const pipeline = [
      {
        $match: m.conditionForActualRecord,
      },
      {
        $project: {
          _id: 1,
          pools: 1,
          questionnaireName: 1,
          questionnaireDescription: 1,
          questionnaireDefinition: 1,
          participants: 1,
        },
      },
      { $unwind: '$pools' },
      {
        $lookup: {
          from: 'pools',
          localField: 'pools._id',
          foreignField: '_id',
          as: 'pools',
        },
      },
      { $unwind: '$pools' },
      {
        $lookup: {
          from: 'poolParticipants',
          localField: 'pools._id',
          foreignField: 'poolId._id',
          as: 'poolParticipants',
        },
      },
      { $unwind: '$poolParticipants' },
      { $match: { 'poolParticipants.guid': fhirId } },
      {
        $lookup: {
          from: 'participants',
          localField: 'poolParticipants.guid',
          foreignField: 'guid',
          as: 'participants',
        },
      },
      { $unwind: '$participants' },
      {
        $unwind: {
          path: '$participants.answersToQuestionnaires',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          isQuestionIdMatched: {
            $eq: ['$_id', '$participants.answersToQuestionnaires.questionnaireId._id'],
          },
        },
      },
      {
        $match: {
          $and: [
            { isQuestionIdMatched: true },
            {
              'participants.answersToQuestionnaires.status': {
                $eq: questionnaireStatuses.inProgress,
              },
            },
          ],
        },
      },
      { $limit: 1 },
      {
        $project: {
          questionnaireName: 1,
          status: '$participants.answersToQuestionnaires.status',
          answers: '$participants.answersToQuestionnaires.answers',
          nextQuestion: '$participants.answersToQuestionnaires.nextQuestion',
          questionnaireDescription: 1,
          questionnaireDefinition: 1,
        },
      },
    ];

    const inProgressQuestionnaires = await mongoose.model('questionnaires').aggregate(pipeline);

    if (!_.isEmpty(inProgressQuestionnaires)) {
      return inProgressQuestionnaires[0];
    }
    return null;
  }

  async function getNotStartedQuestionnaire(fhirId) {
    const pipeline = [
      {
        $match: m.conditionForActualRecord,
      },
      {
        $project: {
          _id: 1,
          pools: 1,
          questionnaireName: 1,
          questionnaireDescription: 1,
          questionnaireDefinition: 1,
          participants: 1,
        },
      },
      { $unwind: '$pools' },
      {
        $lookup: {
          from: 'pools',
          localField: 'pools._id',
          foreignField: '_id',
          as: 'pools',
        },
      },
      { $unwind: '$pools' },
      {
        $lookup: {
          from: 'poolParticipants',
          localField: 'pools._id',
          foreignField: 'poolId._id',
          as: 'poolParticipants',
        },
      },
      { $unwind: '$poolParticipants' },
      { $match: { 'poolParticipants.guid': fhirId } },
      {
        $lookup: {
          from: 'participants',
          localField: 'poolParticipants.guid',
          foreignField: 'guid',
          as: 'participants',
        },
      },
      { $unwind: '$participants' },
      {
        $unwind: {
          path: '$participants.answersToQuestionnaires',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: '$_id',
          startedQuestionnaires: {
            $addToSet: '$participants.answersToQuestionnaires.questionnaireId._id',
          },
          questionnaireDescription: { $first: '$questionnaireDescription' },
          questionnaireDefinition: { $first: '$questionnaireDefinition' },
          questionnaireName: { $first: '$questionnaireName' },
        },
      },
      {
        $addFields: {
          isQuestionnaireStarted: { $in: ['$_id', '$startedQuestionnaires'] },
        },
      },
      { $match: { isQuestionnaireStarted: false } },
      { $limit: 1 },
      {
        $project: {
          questionnaireName: 1,
          status: questionnaireStatuses.notStarted,
          questionnaireDescription: 1,
          questionnaireDefinition: 1,
        },
      },
    ];

    const notStartedQuestionnaires = await mongoose.model('questionnaires').aggregate(pipeline);

    if (!_.isEmpty(notStartedQuestionnaires)) {
      return notStartedQuestionnaires[0];
    }
    return null;
  }

  m.getQuestionnaireByFhirId = async (req, res, next) => {
    const fhirId = req.params.id || '';
    try {
      const questionnaire = (await getInProgressQuestionnaire(fhirId)) || (await getNotStartedQuestionnaire(fhirId));

      if (!questionnaire) {
        return res.json({
          success: false,
          message: 'No questionnaires available for this participant',
        });
      }
      return res.json({
        success: true,
        data: _.pick(questionnaire, [
          '_id',
          'status',
          'questionnaireName',
          'questionnaireDescription',
          'questionnaireDefinition',
          'nextQuestion',
          'answers',
        ]),
      });
    } catch (e) {
      log.error(e.stack);
      return res.json({
        success: false,
        message: 'Unable to retrieve any questionnaires for this participant',
      });
    }
  };

  function getNextQuestion(questionsObj, answersObj) {
    const answeredQuestions = Object.keys(answersObj);
    const allQuestions = Object.keys(questionsObj);
    return allQuestions.find((questionName) => !answeredQuestions.includes(questionName));
  }

  /**
   * Post data as req.data = {questionnaireId: ObjectID, answers: {questionId: answer}}
   * @param req
   * @param res
   * @param next
   */
  m.postQuestionnaireAnswers = async (req, res, next) => {
    const requestTime = new Date();

    const fhirId = req.params.id;
    const questionnaireId = _.get(req, 'body.data.questionnaireId');
    if (!questionnaireId || !mongoose.Types.ObjectId.isValid(questionnaireId)) {
      return res.json({
        success: false,
        message: 'Invalid data.questionnaireId. It should be a string represented as valid ObjectID.',
      });
    }
    const questionnaireObjectId = mongoose.Types.ObjectId(questionnaireId);

    try {
      const participant = await mongoose.model('participants').findOne({
        ...m.conditionForActualRecord,
        guid: fhirId,
        'answersToQuestionnaires.questionnaireId._id': questionnaireObjectId,
      });

      if (!participant) {
        return res.json({
          success: false,
          message: 'Questionnaire is not found for specified participant.',
        });
      }

      const answersToQIndex = participant.answersToQuestionnaires.findIndex(
        (answersToQ) => answersToQ.questionnaireId._id.toString() === questionnaireId
      );
      const answersToQ = participant.answersToQuestionnaires[answersToQIndex];

      if (answersToQ.get('status') === questionnaireStatuses.completed) {
        return res.json({
          success: false,
          message: 'Unable to record answers for completed questionnaire.',
        });
      }
      const startTime = answersToQ.get('startTime');
      if (!startTime) {
        return res.json({
          success: false,
          message: 'Unable to record answers for not started questionnaire.',
        });
      }

      const dbAnswers = answersToQ.answers || {};
      const clientAnswers = _.get(req, 'body.data.answers', {});
      const newAnswers = _.assign({}, dbAnswers, clientAnswers);

      const questionnaire = await mongoose.model('questionnaires').findOne(questionnaireObjectId).lean().exec();
      const questionsObj = questionnaire.questionnaireDefinition.questionnaire;
      const nextQuestion = getNextQuestion(questionsObj, newAnswers);

      const successfulResponse = {
        success: true,
        message: nextQuestion ? 'Your answers have been recorded' : 'All questions have been answered',
        nextQuestion,
      };

      if (_.isEqual(newAnswers, dbAnswers)) {
        return res.json(successfulResponse);
      }

      answersToQ.set('answers', newAnswers);
      answersToQ.set('nextQuestion', nextQuestion);

      const status = nextQuestion ? questionnaireStatuses.inProgress : questionnaireStatuses.completed;
      answersToQ.set('status', status);

      if (status === questionnaireStatuses.completed) {
        const spentTimeInSeconds = parseInt(0.001 * (requestTime.getTime() - new Date(startTime).getTime()), 10);

        answersToQ.set('endTime', requestTime);
        answersToQ.set('spentTime', spentTimeInSeconds);
      }

      participant.markModified(`answersToQuestionnaires.${answersToQIndex}`);
      await participant.save();

      res.json(successfulResponse);
    } catch (e) {
      log.error(e.stack);
      res.json({ success: false, message: 'Unable to record the answers' });
    }
  };

  m.startQuestionnaire = async (req, res, next) => {
    const fhirId = req.params.id;
    const questionnaireId = _.get(req, 'body.data.questionnaireId');
    if (!questionnaireId || !mongoose.Types.ObjectId.isValid(questionnaireId)) {
      return res.json({
        success: false,
        message: 'Invalid questionnaireId. It should be a string represented as valid ObjectID.',
      });
    }

    const questionnaireObjectID = mongoose.Types.ObjectId(questionnaireId);
    const questionnaire = await mongoose
      .model('questionnaires')
      .findOne({ ...m.conditionForActualRecord, _id: questionnaireObjectID });
    if (!questionnaire) {
      return res.json({
        success: false,
        message: `Unable to find questionnaire with _id ${questionnaireId}`,
      });
    }

    const participant = await mongoose.model('participants').findOne({ ...m.conditionForActualRecord, guid: fhirId });
    if (!participant) {
      return res.json({
        success: false,
        message: `Unable to find participant with De-Identified ID: '${fhirId}'`,
      });
    }

    try {
      const response = await mongoose.model('participants').updateOne(
        {
          _id: participant._id,
          'answersToQuestionnaires.questionnaireId._id': {
            $ne: questionnaireObjectID,
          },
        },
        {
          $addToSet: {
            // TODO: mongoose runs this query twice, possibly because of this: https://stackoverflow.com/questions/36822745/node-workaround-for-mongoose-pushing-twice-after-saving-twice, replaced with $addToSet. Need to get rid of Mongoose
            answersToQuestionnaires: {
              questionnaireId: {
                label: questionnaireId, // not real
                table: 'questionnaires',
                _id: questionnaireObjectID,
              },
              status: questionnaireStatuses.inProgress,
              startTime: new Date(),
            },
          },
        }
      );

      const { nModified } = response;
      if (nModified === 1) {
        return res.json({
          success: true,
          message: 'Your questionnaire has been started',
        });
      }
      if (nModified === 0) {
        return res.json({
          success: false,
          message: 'Cannot start already started questionnaire.',
        });
      }
    } catch (e) {
      log.error(e.stack);
      res.json({ success: false, message: 'Unable to start questionnaire' });
    }
  };

  m.getQuestionnaireAnswers = async (req, res) => {
    const pipeline = [
      {
        $match: {
          ...m.conditionForActualRecord,
          answersToQuestionnaires: { $ne: null },
        },
      },
      { $unwind: '$answersToQuestionnaires' },
      {
        $group: {
          _id: {
            questionnaireId: '$answersToQuestionnaires.questionnaireId._id',
            guid: '$guid',
          },
          answers: { $first: '$answersToQuestionnaires.answers' },
          nextQuestion: { $first: '$answersToQuestionnaires.nextQuestion' },
        },
      },
      {
        $lookup: {
          from: 'questionnaires',
          localField: '_id.questionnaireId',
          foreignField: '_id',
          as: 'questionnaire',
        },
      },
      { $unwind: '$questionnaire' },
      {
        $project: {
          _id: 0,
          questionnaireId: '$_id.questionnaireId',
          guid: '$_id.guid',
          questionnaireDescription: '$questionnaire.questionnaireDescription',
          questionnaireName: '$questionnaire.questionnaireName',
          questionnaire: '$questionnaire.questionnaireDefinition.questionnaire',
          answers: '$answers',
          nextQuestion: '$nextQuestion',
        },
      },
    ];

    try {
      const data = await mongoose.model('participants').aggregate(pipeline);
      const results = [];
      _.forEach(data, (questionnaireAnswersObj) => {
        const singleAnswerTemplate = _.pick(questionnaireAnswersObj, [
          'questionnaireId',
          'guid',
          'questionnaireName',
          'nextQuestion',
        ]);

        _.forEach(questionnaireAnswersObj.questionnaire, (questionnaireObj, questionnaireKey) => {
          // unwind each question-answer pair in questionnaire to separate object
          const answer = _.get(questionnaireAnswersObj, `answers.${questionnaireKey}`);
          if (!answer) {
            return;
          }

          results.push({
            ...singleAnswerTemplate,
            questionnaire: {
              [questionnaireKey]: {
                ...questionnaireObj,
                answer,
              },
            },
          });
        });
      });
      res.json({ success: true, data: results });
    } catch (e) {
      log.error(e.stack);
      res.json({
        success: false,
        message: 'Unable to get the questionnaire answers',
      });
    }
  };

  return m;
};
