const puppeteer = require('puppeteer');
const _ = require('lodash');

const {
  getLaunchOptions,
  loginWithUser,
  getTextForSelector,
  getUrlFor,
  form: {
    clickCreateNewButton,
  },
  submit: {
    clickSubmit,
    getSubmitMsg
  }
} = require('../../utils');

const PAGE_TO_TEST = 'formValidation';

const isDate = fieldName => ['dateWithMinMax', 'timeWithMinMax', 'dateTimeWithMinMax'].includes(fieldName);

const padDateStringWithZeros = dateStr => dateStr.split('/').map(p => _.padStart(p, 2, '0')).join('/')

const getFieldValue = (testDef) => {
  return isDate(testDef.fieldName) ?
    padDateStringWithZeros(testDef.fieldValue) :
    testDef.fieldValue;
}

const getFieldSelector = (testDef) => {
  return `#${testDef.fieldName}`;
}

describe('form field validation', () => {
  beforeAll(async () => {
    this.browser = await puppeteer.launch(getLaunchOptions());
    this.context = await this.browser.createIncognitoBrowserContext();
    const page = await this.context.newPage();
    await loginWithUser(page);
    await page.close();
  });

  afterAll(async () => {
    await this.browser.close();
  });

  beforeEach(async () => {
    this.page = await this.context.newPage();
    await this.page.goto(getUrlFor(PAGE_TO_TEST));
    await clickCreateNewButton(this.page);
  });

  afterEach(async () => {
    await this.page.close();
  });

  const testWithErrors = [
    {
      fieldName: 'stringWithRegex',
      fieldValue: '111',
      validationRule: 'regex',
      errorMessage: 'Value 111 is not correct, should contain only latin letters without whitespaces',
      message: 'invalid value for regex',
    },

    {
      fieldName: 'stringWithMinMaxLength',
      fieldValue: '1234',
      validationRule: 'minLength',
      errorMessage: 'Value is too short, should be at least 5 characters long',
      message: 'left border for minLength',
    },

    {
      fieldName: 'stringWithMinMaxLength',
      fieldValue: '1',
      validationRule: 'minLength',
      errorMessage: 'Value is too short, should be at least 5 characters long',
      message: 'less than left border minLength',
    },

    {
      fieldName: 'stringWithMinMaxLength',
      fieldValue: '12345678910',
      validationRule: 'maxLength',
      errorMessage: 'Value is too long, should be at most 10 characters long',
      message: 'right border for maxLength',
    },

    {
      fieldName: 'stringWithMinMaxLength',
      fieldValue: '123456789 10 11 12',
      validationRule: 'maxLength',
      errorMessage: 'Value is too long, should be at most 10 characters long',
      message: 'more than right border for maxLength',
    },

    {
      fieldName: 'numberWithMinMax',
      fieldValue: '4',
      validationRule: 'min',
      errorMessage: 'Value 4 is too small, should be greater than or equal 5',
      message: 'left border for minNumber',
      type: 'Number',
    },
    {
      fieldName: 'numberWithMinMax',
      fieldValue: '1',
      validationRule: 'min',
      errorMessage: 'Value 1 is too small, should be greater than or equal 5',
      message: 'less than left border for minNumber',
      type: 'Number',
    },

    {
      fieldName: 'numberWithMinMax',
      fieldValue: '11',
      validationRule: 'max',
      errorMessage: 'Value 11 is too large, should be less than or equal 10',
      message: 'right border for maxNumber',
      type: 'Number',
    },

    {
      fieldName: 'numberWithMinMax',
      fieldValue: '16',
      validationRule: 'max',
      errorMessage: 'Value 16 is too large, should be less than or equal 10',
      message: 'more than right border for maxNumber',
      type: 'Number',
    },

    {
      fieldName: 'dateWithMinMax',
      fieldValue: '12/31/2019',
      validationRule: 'min',
      errorMessage: 'Date 12/31/2019 should be after 1/1/2020 (1/1/2020)',
      message: 'left border for minDate',
    },

    {
      fieldName: 'dateWithMinMax',
      fieldValue: '1/12/2007',
      validationRule: 'min',
      errorMessage: 'Date 1/12/2007 should be after 1/1/2020 (1/1/2020)',
      message: 'less than left border for minDate',
    },

    {
      fieldName: 'dateWithMinMax',
      fieldValue: '1/11/2020',
      validationRule: 'max',
      errorMessage: 'Date 1/11/2020 should be before 1/10/2020 (1/10/2020)',
      message: 'right border for maxDate'
    },

    {
      fieldName: 'dateWithMinMax',
      fieldValue: '1/31/2022',
      validationRule: 'max',
      errorMessage: 'Date 1/31/2022 should be before 1/10/2020 (1/10/2020)',
      message: 'more than right border for maxDate'
    },

    {
      fieldName: 'dateTimeWithMinMax',
      fieldValue: '1/1/2020 10:49 am',
      validationRule: 'min',
      errorMessage: 'DateTime 1/1/2020 10:49 am should be after 1/1/2020 10:50 am (1/1/2020 10:50 am)',
      message: 'left border for minTime',
    },


    {
      fieldName: 'dateTimeWithMinMax',
      fieldValue: '1/1/2020 7:49 am',
      validationRule: 'min',
      errorMessage: 'DateTime 1/1/2020 7:49 am should be after 1/1/2020 10:50 am (1/1/2020 10:50 am)',
      message: 'less than left border for minTime',
    },

    {
      fieldName: 'dateTimeWithMinMax',
      fieldValue: '1/10/2020 10:51 am',
      validationRule: 'max',
      errorMessage: 'DateTime 1/10/2020 10:51 am should be before 1/10/2020 10:50 am (1/10/2020 10:50 am)',
      message: 'left border for minDateTime',
    },

    {
      fieldName: 'dateTimeWithMinMax',
      fieldValue: '1/13/2020 10:51 am',
      validationRule: 'max',
      errorMessage: 'DateTime 1/13/2020 10:51 am should be before 1/10/2020 10:50 am (1/10/2020 10:50 am)',
      message: 'more than left border for minDateTime',
    },

    {
      fieldName: 'timeWithMinMax',
      fieldValue: '9:59 am',
      validationRule: 'min',
      errorMessage: 'Time 9:59 am should be after 10:00 am (10:00 am)',
      message: 'left border for minTime',
    },

    {
      fieldName: 'timeWithMinMax',
      fieldValue: '7:33 am',
      validationRule: 'min',
      errorMessage: 'Time 7:33 am should be after 10:00 am (10:00 am)',
      message: 'less than left border for minTime',
    },

    {
      fieldName: 'timeWithMinMax',
      fieldValue: '11:01 am',
      validationRule: 'max',
      errorMessage: 'Time 11:01 am should be before 11:00 am (11:00 am)',
      message: 'right border for maxTime',
    },

    {
      fieldName: 'timeWithMinMax',
      fieldValue: '11:35 am',
      validationRule: 'max',
      errorMessage: 'Time 11:35 am should be before 11:00 am (11:00 am)',
      message: 'more than right border for maxTime',
    },
  ];

  for (const testDef of testWithErrors) {
    test(
      `Should display validation message for field "${testDef.fieldName}" with value ${testDef.fieldValue}
      for ${testDef.validationRule} validation rule and ${testDef.message}`,
      async () => {
        const selector = getFieldSelector(testDef);
        const fieldValue = getFieldValue(testDef)

        await this.page.type(selector, fieldValue);
        await this.page.$eval(selector, e => e.blur());

        const errorMessageSelector = `[ng-field-name="${testDef.fieldName}"] [ng-message="${testDef.validationRule}"]`;
        await this.page.waitForSelector(errorMessageSelector);

        const actualErrorMessage = await getTextForSelector(errorMessageSelector, this.page);
        expect(actualErrorMessage).toBe(testDef.errorMessage);

        await clickSubmit(this.page);
        const form = await this.page.waitForSelector('form.ng-invalid.ng-submitted');

        expect(form).toBeTruthy();
      });
  }

  const testWithSuccess = [
    {
      fieldName: 'stringWithRegex',
      fieldValue: 'abcdEFGH',
      validationRule: 'regex',
      message: 'correct input for regex(latin letters only)',
    },
    {
      fieldName: 'stringWithMinMaxLength',
      fieldValue: '12345',
      validationRule: 'minLength',
      message: 'left border',
    },
    {
      fieldName: 'stringWithMinMaxLength',
      fieldValue: '1234567890',
      validationRule: 'maxLength',
      message: 'right border',
    },

    {
      fieldName: 'numberWithMinMax',
      fieldValue: '5',
      validationRule: 'min',
      message: 'left border',
      type: 'Number',
    },
    {
      fieldName: 'numberWithMinMax',
      fieldValue: '10',
      validationRule: 'max',
      message: 'right border',
      type: 'Number',
    },

    {
      fieldName: 'dateWithMinMax',
      fieldValue: '1/1/2020',
      validationRule: 'min',
      message: 'left border',
    },
    {
      fieldName: 'dateWithMinMax',
      fieldValue: '1/10/2020',
      validationRule: 'max',
      message: 'right border',
    },

    {
      fieldName: 'dateTimeWithMinMax',
      fieldValue: '1/1/2020 10:50 am',
      validationRule: 'min',
      message: 'left border',
    },
    {
      fieldName: 'dateTimeWithMinMax',
      fieldValue: '1/10/2020 10:50 am',
      validationRule: 'max',
      message: 'right border',
    },


    {
      fieldName: 'timeWithMinMax',
      fieldValue: '10:00 am',
      validationRule: 'min',
      message: 'left border',
    },
    {
      fieldName: 'timeWithMinMax',
      fieldValue: '11:00 am',
      validationRule: 'max',
      message: 'right border',
    },
  ];

  for (const testDef of testWithSuccess) {
    test(
      `Should pass for field "${testDef.fieldName}" with ${testDef.message} for ${testDef.validationRule} validation rule`,
      async () => {
        const selector = getFieldSelector(testDef);
        const fieldValue = getFieldValue(testDef)

        await this.page.type(selector, fieldValue);
        await this.page.$eval(selector, e => e.blur());

        const validControl = await this.page.$(`[name=${testDef.fieldName}].ng-valid`);
        expect(validControl).toBeTruthy();

        const [__, message] = await Promise.all([
          clickSubmit(this.page),
          getSubmitMsg(this.page),
        ]);

        expect(message).toBeTruthy();
      });
  }
});
