module.exports = function (/*globalMongoose*/) {
    const Promise = require('bluebird');
    Promise.config({ cancellation: true });
    const rp = require('request-promise');
    const _ = require('lodash');

    let m = {};

    m.init = (appLib) => {
        appLib.addRoute('get', `/adverse-events`, [m.getAdverseEvents]);
    };

    const ALLOW_VALUES = {
        GENDER: ['0', '1', '2'],
    };

    const REQUEST_STEP = 40;
    const RECORDS_TO_FIND = 20;
    const CONCURRENT_REQUESTS = 3;

    const stopCondition = (data) => data.list.length >= RECORDS_TO_FIND;

    const requestEvents = function(data, paginationState) {
        let options = {
            uri: '',
            json: true,
            headers: {'Keep-Alive': 'timeout=60'}
        };

        options.uri = getUrlWithPagination(paginationState);
        paginationState.pagesRequested++;

        return rp(options)
            .then(res => {
                addEvents(res, data);
                return res;
            });
    };

    function loopRequest(data, state) {
        return new Promise((resolve, reject) => {
            const steps = _.range(1, state.pages);
            let promiseMap;

            const action = () => {
                return requestEvents(data, state)
                    .then(() => {
                        if (stopCondition(data)) {
                            promiseMap.cancel();

                            resolve(data);
                        }
                    });
            };

            promiseMap = Promise.map(steps, action, { concurrency: CONCURRENT_REQUESTS })
                .then(() => resolve(data))
                .catch((e) => {
                    console.log(e);
                    reject('Something wne wrong while loopRequest.');
                });
        });
    }

    m.getAdverseEvents = (req, res, next) => {
        return new Promise((resolve, reject) => {
            let {isValid, message} = validate(req.query);

            if (isValid) {
                resolve(req.query);
            } else {
                reject(`Bad request: ${message}`);
            }
        })
            .then(query => {
                let data = {
                    list: [],
                    rxcui: query.rxcui,
                    start: Date.now()
                };

                let paginationState = {
                    pagesRequested: 0,
                    // at least one request
                    pages: 1,
                    endpoint: getEndpoint(query)
                };

                // request first page to get total number of records
                return requestEvents(data, paginationState)
                    .then(res => {
                        data.total = res.meta.results.total;
                        paginationState.total = res.meta.results.total;
                        paginationState.pages = Math.ceil(data.total / REQUEST_STEP);
                    })
                    .then(() => loopRequest(data, paginationState));
            })
            .then(data => {
                data.end = Date.now() - data.start;

                return res.json({
                    success: true,
                    data: data
                });
            })
            .catch((e) => {
                console.log(e);
                res.json({success: false, message: `${e}`});
            })
            .finally(() => next());

    };

    function validate(query) {
        if (!query.rxcui) {
            return {isValid: false, message: 'Rxcui list is required.'}
        }

        if (query.gender && ALLOW_VALUES.GENDER.indexOf(query.gender) === -1) {
            return {isValid: false, message: 'Gender value is not allowed.'}
        }

        if ((query.minage && !query.maxage) || (query.maxage && !query.minage)) {
            return {isValid: false, message: 'Minage and maxage fields must be both specified.'}
        }

        return {isValid: true};
    }

        function getEndpoint(query) {
            const endpoint = 'https://api.fda.gov/drug/event.json?search=';
            let rxcui = `patient.drug.openfda.rxcui:${query.rxcui}`;
            let age, sex;

            if (query.minage && query.maxage) {
                age = `patient.patientonsetage:[${query.minage}+TO+${query.maxage}]+AND+patient.patientonsetageunit:801`;
            }

            if (query.gender) {
                sex = `patient.patientsex:${query.gender}`;
            }

            return endpoint + [rxcui, age, sex].filter(v => !!v).join('+AND+');
        }

    function getUrlWithPagination(paginationState) {
        let skip = paginationState.pagesRequested * REQUEST_STEP;
        let nextSkip = skip + REQUEST_STEP;
        let limit = REQUEST_STEP;

        // NOTE: we need to know exact amount of items skip. if we pass wrong, openfda wil throw error
        if (nextSkip > paginationState.total) {
            paginationState.limit = paginationState.total % REQUEST_STEP;
        }

        return paginationState.endpoint + '&' + `skip=${skip}&limit=${limit}`;
    }

    function addEvents(res, data) {
        for (let i = 0; i < res.results.length; i++) {
            if (data.list.length >= RECORDS_TO_FIND) break;

            let event = res.results[i];

            const drugs = _.get(event, 'patient.drug', []);

            let foundDrug = _.find(drugs, drug => {
                let rxcuis = _.get(drug, 'openfda.rxcui', []);
                let foundRxcui = rxcuis.includes(data.rxcui);
                let hasDrugcharacterization = ['1', '3'].includes(drug.drugcharacterization);

                return foundRxcui && hasDrugcharacterization;
            });

            if (foundDrug) {
                data.list.push(event);
            }
        }

        return data;
    }

    return m;
};






