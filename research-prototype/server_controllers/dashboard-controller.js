const _ = require('lodash');
const { ObjectID } = require('mongodb');
const log = require('log4js').getLogger('research-app-model/dashboard-controller');
const questionnaireStatuses = require('../helpers/questionnaire_helper').statuses;

module.exports = function () {
  const m = {};

  m.init = (appLib) => {
    m.appLib = appLib;
    m.db = m.appLib.db;
    m.conditionForActualRecord = m.appLib.dba.getConditionForActualRecord();

    appLib.addRoute('get', `/dashboards/dashboard/data`, [appLib.isAuthenticated, m.dashboard]);
  };

  const getNotStartedQuestionnaires = (userId) => {
    const pipeline = [
      { $match: { ...m.conditionForActualRecord, 'creator._id': userId } },
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
          localField: 'pools',
          foreignField: '_id',
          as: 'pools',
        },
      },
      { $unwind: '$pools' },
      {
        $lookup: {
          from: 'poolparticipants',
          localField: 'pools._id',
          foreignField: 'poolId',
          as: 'poolParticipants',
        },
      },
      { $unwind: '$poolParticipants' },
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
          _id: { questionaireId: '$_id', guid: '$participants.guid' },
          answeredQuestionnaireIds: {
            $addToSet: '$participants.answersToQuestionnaires.questionnaireId._id',
          },
          questionnaireName: { $first: '$questionnaireName' },
        },
      },
      {
        $addFields: {
          isQuestionAnswered: {
            $in: ['$_id.questionaireId', '$answeredQuestionnaireIds'],
          },
        },
      },
      { $match: { isQuestionAnswered: false } },
      {
        $group: {
          _id: '$_id.questionaireId',
          count: { $sum: 1 },
          questionnaireName: { $first: '$questionnaireName' },
        },
      },
      {
        $project: {
          questionnaire: {
            _id: '$_id',
            questionnaireName: '$questionnaireName',
          },
          stats: {
            [questionnaireStatuses.notStarted]: '$count',
          },
          _id: 0,
        },
      },
    ];

    return m.db.model('questionnaires').aggregate(pipeline);
  };

  const getInProgressAndCompletedQuestionnaires = async (userId) => {
    const pipeline = [
      { $match: m.conditionForActualRecord },
      {
        $project: {
          answersToQuestionnaires: 1,
          _id: 0,
        },
      },
      {
        $unwind: '$answersToQuestionnaires',
      },
      {
        $group: {
          _id: {
            questionnaireId: '$answersToQuestionnaires.questionnaireId._id',
            questionnaireStatus: '$answersToQuestionnaires.status',
          },
          answersToQuestionnaires: { $first: '$answersToQuestionnaires' },
          count: {
            $sum: 1,
          },
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
      {
        $unwind: '$questionnaire',
      },
      { $match: { 'questionnaire.creator._id': userId } },
      {
        $group: {
          _id: '$questionnaire._id',
          questionnaire: { $first: '$questionnaire' },
          stats: {
            $push: {
              count: '$count',
              status: {
                $ifNull: ['$answersToQuestionnaires.status', questionnaireStatuses.completed],
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          questionnaire: {
            _id: '$_id',
            questionnaireName: '$questionnaire.questionnaireName',
          },
          stats: '$stats',
        },
      },
    ];

    const docs = await m.db.model('participants').aggregate(pipeline);
    _.forEach(docs, (doc) => {
      const newStats = {};
      _.forEach(doc.stats, (stat) => {
        newStats[stat.status] = stat.count;
      });
      doc.stats = newStats;
    });

    return docs;
  };

  const writeZeroStatuses = (obj) => {
    const newObj = _.clone(obj);
    _.forEach(questionnaireStatuses, (questionnaireStatus) => {
      if (newObj.stats[questionnaireStatus] === undefined) {
        newObj.stats[questionnaireStatus] = 0;
      }
    });

    return newObj;
  };

  const getQuestionnaireProgressChart = async (userId) => {
    const [inProgressAndCompletedQ, notStartedQ] = await Promise.all([
      getInProgressAndCompletedQuestionnaires(userId),
      getNotStartedQuestionnaires(userId),
    ]);

    const result = _(inProgressAndCompletedQ)
      .concat(notStartedQ)
      .groupBy('questionnaire._id')
      .map(_.spread(_.merge))
      .map(writeZeroStatuses)
      .value();

    return result;
  };

  const getQuestionnaireSpentTimeChart = (userId) => {
    const pipeline = [
      { $match: m.conditionForActualRecord },
      {
        $unwind: '$answersToQuestionnaires',
      },
      {
        $match: {
          'answersToQuestionnaires.spentTime': {
            $ne: null,
          },
        },
      },
      {
        $lookup: {
          from: 'questionnaires',
          localField: 'answersToQuestionnaires.questionnaireId._id',
          foreignField: '_id',
          as: 'questionnaire',
        },
      },
      {
        $unwind: '$questionnaire',
      },
      { $match: { 'questionnaire.creator._id': userId } },
      {
        $group: {
          _id: '$answersToQuestionnaires.questionnaireId._id',
          average: { $avg: '$answersToQuestionnaires.spentTime' },
          questionnaire: { $first: '$questionnaire' },
        },
      },
      {
        $project: {
          questionnaire: {
            _id: '$_id',
            questionnaireName: '$questionnaire.questionnaireName',
          },
          stats: {
            average: '$average',
            anticipated: {
              $ifNull: ['$questionnaire.anticipatedTime', 0],
            },
          },
          _id: 0,
        },
      },
    ];
    return m.db.model('participants').aggregate(pipeline);
  };

  const getQuestionnaireDayChart = async (days = 30, userId) => {
    const oneDayInSec = 1000 * 60 * 60 * 24;
    const now = Date.now();
    const today = now - (now % oneDayInSec);
    const nDaysAgo = today - oneDayInSec * days;

    const rangeStart = new Date(nDaysAgo);
    const rangeEnd = new Date(today + oneDayInSec);

    const results = {};
    let thisDay = new Date(nDaysAgo);
    // build object for last n days with 0 count
    while (thisDay < rangeEnd) {
      results[thisDay.toISOString()] = 0;
      thisDay = new Date(thisDay.valueOf() + oneDayInSec);
    }

    const day0 = new Date(0);
    const pipeline = [
      { $match: m.conditionForActualRecord },
      {
        $unwind: '$answersToQuestionnaires',
      },
      {
        $match: {
          // stats only for finished questionnaires
          $and: [
            { 'answersToQuestionnaires.endTime': { $ne: null } },
            { 'answersToQuestionnaires.endTime': { $gte: rangeStart } },
          ],
        },
      },
      {
        $lookup: {
          from: 'questionnaires',
          localField: 'answersToQuestionnaires.questionnaireId._id',
          foreignField: '_id',
          as: 'questionnaire',
        },
      },
      {
        $unwind: '$questionnaire',
      },
      { $match: { 'questionnaire.creator._id': userId } },
      {
        $group: {
          _id: {
            $add: [
              {
                $subtract: [
                  { $subtract: ['$answersToQuestionnaires.endTime', day0] },
                  {
                    $mod: [{ $subtract: ['$answersToQuestionnaires.endTime', day0] }, oneDayInSec],
                  },
                ],
              },
              day0,
            ],
          },
          count: { $sum: 1 },
        },
      },
    ];

    const doc = await m.db.model('participants').aggregate(pipeline);
    _.forEach(doc, (stat) => {
      results[stat._id.toISOString()] = stat.count;
    });

    return [
      {
        name: `Completed questionnaires by day for last ${days} days`,
        data: results,
      },
    ];
  };

  const getQuestionnairesCount = (userId) => {
    // TODO: scope to the current user only
    return m.db.model('questionnaires').countDocuments({ ...m.conditionForActualRecord, 'creator._id': userId });
  };

  const getAnswersCount = async (userId) => {
    // TODO: scope to the current user only
    const allAnswersToQuestionnaires = await m.db.model('participants').aggregate([
      { $match: m.conditionForActualRecord },
      {
        $project: {
          answersToQuestionnaires: 1,
          _id: 0,
        },
      },
      {
        $unwind: '$answersToQuestionnaires',
      },
      {
        $lookup: {
          from: 'questionnaires',
          localField: 'answersToQuestionnaires.questionnaireId._id',
          foreignField: '_id',
          as: 'questionnaires',
        },
      },
      { $match: { 'questionnaires.creator._id': userId } },
      { $project: { 'answersToQuestionnaires.answers': 1, _id: 0 } },
    ]);

    let allAnswersCnt = 0;
    _.forEach(allAnswersToQuestionnaires, (answerToQuestionnaire) => {
      const answersObject = answerToQuestionnaire.answersToQuestionnaires.answers;
      const answersCnt = _.keys(answersObject).length;
      allAnswersCnt += answersCnt;
    });
    return allAnswersCnt;
  };

  const getParticipantsCount = () => {
    return m.db.model('participants').countDocuments(m.conditionForActualRecord);
  };

  m.dashboard = async (req, res) => {
    try {
      const userId = new ObjectID(req.user._id);
      const [
        questionnaireProgressChart,
        questionnaireSpentTimeChart,
        questionnaireDayChart,
        questionnairesCnt,
        answersCnt,
        participantsCnt,
      ] = await Promise.all([
        getQuestionnaireProgressChart(userId),
        getQuestionnaireSpentTimeChart(userId),
        getQuestionnaireDayChart(30, userId),
        getQuestionnairesCount(userId),
        getAnswersCount(userId),
        getParticipantsCount(userId),
      ]);

      const dashboardData = {
        questionnaireProgressChart: mapDataToProgressChart(questionnaireProgressChart),
        questionnaireSpentTimeChart: mapDataSpentTimeChart(questionnaireSpentTimeChart),
        questionnaireDayChart: mapDataToDayChart(questionnaireDayChart),
        numberOfQuestionnaires: { number: questionnairesCnt },
        numberOfAnswers: { number: answersCnt },
        numberOfParticipants: { number: participantsCnt },
      };
      res.json({ success: true, data: dashboardData });
    } catch (e) {
      log.error(`Unable to get dashboard data`, e.stack);
      res.json({ success: false, data: e.message });
    }
  };

  const mapDataToProgressChart = (data) => {
    let result = [
      ['questionnaireName', 'Completed', 'Not started', 'In Progress'],
    ];

    const getValue = v => v === 0 ? null : v;

    data.forEach((item) => {
      result.push([
        item.questionnaire.questionnaireName,
        getValue(item.stats['Completed']),
        getValue(item.stats['Not started']),
        getValue(item.stats['In Progress']),
      ]);
    });

    return result;
  }

  const mapDataSpentTimeChart = (data) => {
    let result = [
      [
        "questionnaireName",
        "average seconds spent",
        "anticipated seconds spent"
      ],
    ];

    data.forEach((item) => {
      result.push([
        item.questionnaire.questionnaireName,
        item.stats.average,
        item.stats.anticipated,
      ]);
    });

    return result;
  }

  const mapDataToDayChart = (data) => {
    let result = [
      ['Questionnaires', 'Questionnaires Completed in the Last 30 Days'],
    ];
    let answers = data[0].data;

    Object.keys(answers).forEach((date) => {
      result.push([
        date,
        answers[date],
      ]);
    });

    return result;
  };

  return m;
};
