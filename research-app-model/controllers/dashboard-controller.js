/**
 * Implements endpoints of various dashboards
 * @returns {{}}
 */
module.exports = function (globalMongoose) {
    const fs = require('fs');
    const _ = require("lodash");
    //const log = require('log4js').getLogger('lib/dashboard-controller');
    const async = require('async');
    const butil = require('../../hc-backend-v3/lib/backend-util')();

    const mongoose = globalMongoose;
    butil.loadLists();

    let m = {};

    m.mainDashboard_v2 = (req, res, next) => {
        res.json({success: true, data: {}});
        return;
/*
        let dashboardData = {};
        // TODO: implement the real dashboard for real authenticated user
        let user;
        async.series({
                user: (cb) => {
                mongoose.model('users').findOne({_id: req.user.id}, (err, data) => {
                user = data;
        cb(err, user);
    });
    },
        phi: (cb) => {
            mongoose.model('phis').findOne({_id: user.phiId}, (err, data) => {
                user = data;
            cb(err, user);
        });
        }
    }, (err, results) => {
            let phi = results['phi'];
            if (phi) {
                dashboardData = {
                    // TODO: modify the returned text to include date of alert
                    alerts: _(phi.myRecalls).
                    concat(phi.myAdverseEvents).map(o => ({
                        alert: o.subject || o.productName,
                        date: o.date || new Date()
                    })).orderBy(['date'], ['desc'])
                    .slice(0, 3).value(),
                    myBloodPressure: _(phi.homeLabs).
                filter(['testType', '2']).
                orderBy(['dateResult', 'timeResult'], ['desc', 'desc']).
                slice(0, 3).
                map(o => { let a = o.testResult.split('/'); return [parseInt(a[0]), parseInt(a[1])] }).value(),
                    myMedications: _(phi.medicationAdherences).orderBy(['resultDate'], ['desc']).slice(0, 3).map(o => ({
                    number: o.numberMedicationsTaken,
                    date: o.resultDate,
                    kind: o.allMedicationsTaken ? 'Good' : 'Bad'
                })).value(),
                    howAmI: _(phi.moods).orderBy(['dateMood', 'time'], ['desc', 'desc']).// TODO: give good names to the "time" parameter
                slice(0, 3).map(o => ({
                    type: appModelHelpers.Lists.moodTypes[o.moodType].name,
                    date: o.dateMood,
                    kind: appModelHelpers.Lists.moodTypes[o.moodType].dashboardType
                })).value(),
                    // TODO: give good names to the "time" parameter
                    diet: _(phi.diets).orderBy(['mealDate'], ['desc']).
                slice(0, 3).map(o => ({
                    meal: appModelHelpers.Lists.mealType[o.mealType].name,
                    date: o.mealDate,
                    kind: appModelHelpers.Lists.mealType[o.mealType].dashboardType
                })).value(),
                    remindersAndAppointments: ['Appointmenth with Dr. Smith', 'Check the pump battery', 'Meeting with Josh'],
                     //myGlucose - filter 1_phis_home_labs.json for '1': 'Blood Glucose', in testType
                     //my bloodpressure - filter 1_phis_home_labs.json for '2': 'Blood Pressure', in testType
                    myGlucoseLevel: _(phi.homeLabs).
                filter(['testType', '1']).
                orderBy(['dateResult', 'timeResult'], ['desc', 'desc']).
                slice(0, 3).
                map(o => (parseInt(o.testResult))).value(),
                    activities: _(phi.activities).orderBy(['dateActivity'], ['desc']).// TODO: give good names to the "time" parameter
                slice(0, 3).map(o => appModelHelpers.Lists.activities[o.activity] ? appModelHelpers.Lists.activities[o.activity] : o.comment).value()
            };
                res.json({success: true, data: dashboardData});
            } else {
                res.json(400, {success: false, message: "User not found"});
            }
            next();
        });
*/
    };
    m.mainDashboard = m.mainDashboard_v2;

    return m;
};