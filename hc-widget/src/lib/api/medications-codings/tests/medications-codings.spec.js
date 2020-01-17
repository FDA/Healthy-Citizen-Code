import {
  extractRxCuiFromMedicationRequest
} from '../extract-codings.helper';

import epicStu3Resp from './epic-stu3-response';

describe('Medication coding extraction from FHIR servers response', () => {
  test('Should extract correct RXCUI from epic STU3 response', () => {
    const expectedCodes = [
      '161',
      '2670',
      '2672',
      '6470',
      '8896',
      '51428',
      '91168',
      '202479',
      '203302',
      '203303',
      '215056',
      '216399',
      '216400',
      '216632',
      '216634',
      '216834',
      '216864',
      '217295',
      '218221',
      '218515',
      '219127',
      '219198',
      '219496',
      '219501',
      '219506',
      '219529',
      '219673',
      '219887',
      '220077',
      '220080',
      '220118',
      '220440',
      '220586',
      '220650',
      '284810',
      '311376',
      '352994',
      '379604',
      '405037',
      '405363',
      '405381',
      '540435',
      '540518',
      '602196',
      '604826',
      '643092',
      '702747',
      '817579',
      '851961',
      '993764',
      '993781',
      '993783',
      '993793',
      '993796',
      '993819',
      '993822',
      '993837',
      '1049154',
      '1049156',
      '1049668',
      '1050506',
      '1089107',
      '1111769',
      '1111772',
      '1111816',
      '1111822',
      '1358998',
      '1361510',
      '1653202',
      '1653204',
      '1986350',
      '1986356'
    ];
    const codings = extractRxCuiFromMedicationRequest(epicStu3Resp, { dataSource: 'epicStu3' });
    const actualCodes = codings.map(c => c.code);

    expect(actualCodes).toStrictEqual(expectedCodes);
  });
});
