module.exports = function(globalMongoose) {
  const mongoose = globalMongoose;
  const _ = require("lodash");
  const questionnaireStatuses = require("../helpers/questionnaire_helper")
    .statuses;
  const ObjectID = require("mongodb").ObjectID;

  let m = {};

  m.init = appLib => {
    appLib.addRoute("get", `/dashboards/dashboard/data`, [
      appLib.isAuthenticated,
      m.dashboard
    ]);
  };

  const getNotStartedQuestionnaires = userId => {
    const pipeline = [
      { $match: { 'creator._id': userId } },
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
      { $unwind: "$pools" },
      {
        $lookup: {
          from: "pools",
          localField: "pools",
          foreignField: "_id",
          as: "pools"
        }
      },
      { $unwind: "$pools" },
      {
        $lookup: {
          from: "poolparticipants",
          localField: "pools._id",
          foreignField: "poolId",
          as: "poolParticipants"
        }
      },
      { $unwind: "$poolParticipants" },
      {
        $lookup: {
          from: "participants",
          localField: "poolParticipants.guid",
          foreignField: "guid",
          as: "participants"
        }
      },
      { $unwind: "$participants" },
      {
        $unwind: {
          path: "$participants.answersToQuestionnaires",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: { questionaireId: "$_id", guid: "$participants.guid" },
          answeredQuestionnaireIds: {
            $addToSet: "$participants.answersToQuestionnaires.questionnaireId._id"
          },
          questionnaireName: { $first: "$questionnaireName" }
        }
      },
      {
        $addFields: {
          isQuestionAnswered: {
            $in: ["$_id.questionaireId", "$answeredQuestionnaireIds"]
          }
        }
      },
      { $match: { isQuestionAnswered: false } },
      {
        $group: {
          _id: "$_id.questionaireId",
          count: { $sum: 1 },
          questionnaireName: { $first: "$questionnaireName" }
        }
      },
      {
        $project: {
          questionnaire: {
            _id: "$_id",
            questionnaireName: "$questionnaireName"
          },
          stats: {
            [questionnaireStatuses.notStarted]: "$count"
          },
          _id: 0
        }
      }
    ];

    return mongoose
      .model("questionnaires")
      .aggregate(pipeline);
  };

  const getInProgressAndCompletedQuestionnaires = userId => {
    const pipeline = [
      {
        $project: {
          answersToQuestionnaires: 1,
          _id: 0
        }
      },
      {
        $unwind: "$answersToQuestionnaires"
      },
      {
        $group: {
          _id: {
            questionnaireId: "$answersToQuestionnaires.questionnaireId._id",
            questionnaireStatus: "$answersToQuestionnaires.status"
          },
          answersToQuestionnaires: { $first: "$answersToQuestionnaires" },
          count: {
            $sum: 1
          }
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
      {
        $unwind: "$questionnaire"
      },
      { $match: { "questionnaire.creator._id": userId } },
      {
        $group: {
          _id: "$questionnaire._id",
          questionnaire: { $first: "$questionnaire" },
          stats: {
            $push: {
              count: "$count",
              status: {
                $ifNull: ["$answersToQuestionnaires.status", questionnaireStatuses.completed]
              }
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          questionnaire: {
            _id: "$_id",
            questionnaireName: "$questionnaire.questionnaireName"
          },
          stats: "$stats"
        }
      }
    ];

    return mongoose
      .model("participants")
      .aggregate(pipeline)
      .then(docs => {
        _.forEach(docs, doc => {
          const newStats = {};
          _.forEach(doc.stats, stat => {
            newStats[stat.status] = stat.count;
          });
          doc.stats = newStats;
        });

        return docs;
      });
  };

  const writeZeroStatuses = obj => {
    const newObj = _.clone(obj);
    _.forEach(questionnaireStatuses, questionnaireStatus => {
      if (newObj.stats[questionnaireStatus] === undefined) {
        newObj.stats[questionnaireStatus] = 0;
      }
    });

    return newObj;
  };

  const getQuestionnaireProgressChart = userId => {
    return Promise.all([
      getInProgressAndCompletedQuestionnaires(userId),
      getNotStartedQuestionnaires(userId)
    ]).then(([inProgressAndCompletedQ, notStartedQ]) => {
      const result = _(inProgressAndCompletedQ)
        .concat(notStartedQ)
        .groupBy("questionnaire._id")
        .map(_.spread(_.merge))
        .map(writeZeroStatuses)
        .value();

      return result;
    });
  };

  const getQuestionnaireSpentTimeChart = userId => {
    const pipeline = [
      {
        $unwind: "$answersToQuestionnaires"
      },
      {
        $match: {
          "answersToQuestionnaires.spentTime": {
            $ne: null
          }
        }
      },
      {
        $lookup: {
          from: "questionnaires",
          localField: "answersToQuestionnaires.questionnaireId._id",
          foreignField: "_id",
          as: "questionnaire"
        }
      },
      {
        $unwind: "$questionnaire"
      },
      { $match: { "questionnaire.creator._id": userId } },
      {
        $group: {
          _id: "$answersToQuestionnaires.questionnaireId",
          average: { $avg: "$answersToQuestionnaires.spentTime" },
          questionnaire: { $first: "$questionnaire" }
        }
      },
      {
        $project: {
          questionnaire: {
            _id: "$_id",
            questionnaireName: "$questionnaire.questionnaireName"
          },
          stats: {
            average: "$average",
            anticipated: {
              $ifNull: ["$questionnaire.anticipatedTime", 0]
            }
          },
          _id: 0
        }
      }
    ];
    return mongoose.model("participants").aggregate(pipeline);
  };

  const getQuestionnaireDayChart = (days = 30, userId) => {
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
      {
        $unwind: "$answersToQuestionnaires"
      },
      {
        $match: {
          // stats only for finished questionnaires
          $and: [
            { "answersToQuestionnaires.endTime": { $ne: null } },
            { "answersToQuestionnaires.endTime": { $gte: rangeStart } }
          ]
        }
      },
      {
        $lookup: {
          from: "questionnaires",
          localField: "answersToQuestionnaires.questionnaireId",
          foreignField: "_id",
          as: "questionnaire"
        }
      },
      {
        $unwind: "$questionnaire"
      },
      { $match: { "questionnaire.creator._id": userId } },
      {
        $group: {
          _id: {
            $add: [
              {
                $subtract: [
                  { $subtract: ["$answersToQuestionnaires.endTime", day0] },
                  {
                    $mod: [
                      { $subtract: ["$answersToQuestionnaires.endTime", day0] },
                      oneDayInSec
                    ]
                  }
                ]
              },
              day0
            ]
          },
          count: { $sum: 1 }
        }
      }
    ];

    return mongoose
      .model("participants")
      .aggregate(pipeline)
      .then(doc => {
        _.forEach(doc, stat => {
          results[stat._id.toISOString()] = stat.count;
        });

        return [
          {
            name: `Questionnaires by day for last ${days} days`,
            data: results
          }
        ];
      });
  };

  const getQuestionnairesCount = userId => {
    // TODO: scope to the current user only
    return mongoose.model("questionnaires").countDocuments({ 'creator._id': userId });
  };

  const getAnswersCount = userId => {
    // TODO: scope to the current user only
    return mongoose
      .model("participants")
      .aggregate([
        {
          $project: {
            answersToQuestionnaires: 1,
            _id: 0
          }
        },
        {
          $unwind: "$answersToQuestionnaires"
        },
        {
          $lookup: {
            from: "questionnaires",
            localField: "answersToQuestionnaires.questionnaireId._id",
            foreignField: "_id",
            as: "questionnaires"
          }
        },
        { $match: { "questionnaires.creator._id": userId } },
        { $project: { "answersToQuestionnaires.answers": 1, _id: 0 } }
      ])
      .then(allAnswersToQuestionnaires => {
        let allAnswersCnt = 0;
        _.forEach(allAnswersToQuestionnaires, answerToQuestionnaire => {
          const answersObject =
            answerToQuestionnaire.answersToQuestionnaires.answers;
          const answersCnt = _.keys(answersObject).length;
          allAnswersCnt += answersCnt;
        });
        return allAnswersCnt;
      });
  };

  const getParticipantsCount = () => {
    return mongoose.model("participants").countDocuments();
  };

  m.dashboard = (req, res, next) => {
    const userId = new ObjectID(req.user._id);
    Promise.all([
      getQuestionnaireProgressChart(userId),
      getQuestionnaireSpentTimeChart(userId),
      getQuestionnaireDayChart(30, userId),
      getQuestionnairesCount(userId),
      getAnswersCount(userId),
      getParticipantsCount(userId)
    ])
      .then(
        ([
          questionnaireProgressChart,
          questionnaireSpentTimeChart,
          questionnaireDayChart,
          questionnairesCnt,
          answersCnt,
          participantsCnt
        ]) => {
          const dashboardData = {
            questionnaireProgressChart,
            questionnaireSpentTimeChart,
            questionnaireDayChart,
            numberOfQuestionnaires: { number: questionnairesCnt },
            numberOfAnswers: { number: answersCnt },
            numberOfParticipants: { number: participantsCnt }
          };
          res.json({ success: true, data: dashboardData });
          next();
        }
      )
      .catch(err => {
        console.error(`Unable to get dashboard data`, err.stack);
        res.json({ success: false, data: err.message });
      });
  };

  return m;
};
