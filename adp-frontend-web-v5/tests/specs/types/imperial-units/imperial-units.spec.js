const puppeteer = require('puppeteer')

const {
  getLaunchOptions,
  loginWithUser,
  getUrlFor,
  interceptor: {
    getResponseForCreatedRecord,
  },
  form: {
    clickCreateNewButton,
    clickEditButton,
  },
  submit: {
    clickSubmit,
  }
} = require('../../../utils')

const {
  selectImperialUnitMultipleValue,
  getImperialUnitMultipleValue,
} = require('../../../utils/select.helpers')

const {
  selectDxListValue,
  getDxSingleListValue,
} = require('../../../utils/select.helpers')

const FIELD_NAMES = {
  IMPERIAL_WEIGHT: 'imperialWeight',
  IMPERIAL_WEIGHT_WITH_OZ: 'imperialWeightWithOz',
  IMPERIAL_HEIGHT: 'imperialHeight',
}

const PAGE_NAME = 'imperialUnitsTypes'

async function createRecordAndOpenEditForm(pageName, page) {
  const [{ _id }] = await Promise.all([
    getResponseForCreatedRecord(pageName, page),
    clickSubmit(page),
  ]);

  await clickEditButton(_id, page)
}

describe('Imperial Units types', () => {
  beforeAll(async () => {
    this.browser = await puppeteer.launch(getLaunchOptions())
    this.context = await this.browser.createIncognitoBrowserContext()
    const page = await this.context.newPage()
    await loginWithUser(page)
    await page.close()
  })

  afterAll(async () => {
    await this.browser.close()
  })

  describe('Imperial Units types: actions', () => {
    beforeEach(async () => {
      this.page = await this.context.newPage()
      await this.page.goto(getUrlFor(PAGE_NAME))
      await clickCreateNewButton(this.page)
    })

    afterEach(async () => {
      await this.page.close()
    })

    test(
      'Should select Imperial Weight field value',
      async () => {
        const valueToSelect = '4lb'
        await selectDxListValue(valueToSelect, FIELD_NAMES.IMPERIAL_WEIGHT, this.page)
        const actualSelectedValue = await getDxSingleListValue(FIELD_NAMES.IMPERIAL_WEIGHT, this.page)

        expect(actualSelectedValue).toBe(valueToSelect)
      })

    test(
      'Should render Imperial Weight field value on edit',
      async () => {
        const valueToSelect = '3lb'
        await selectDxListValue(valueToSelect, FIELD_NAMES.IMPERIAL_WEIGHT, this.page)
        await createRecordAndOpenEditForm(PAGE_NAME, this.page)

        const actualSelectedValue = await getDxSingleListValue(FIELD_NAMES.IMPERIAL_WEIGHT, this.page)
        expect(actualSelectedValue).toBe(valueToSelect)
      })

    test(
      'Should select Imperial Weight with Oz field value',
      async () => {
        const valueToSelect = ['4lb', '3oz']
        await selectImperialUnitMultipleValue(valueToSelect, FIELD_NAMES.IMPERIAL_WEIGHT_WITH_OZ, this.page)
        const actualSelectedValue = await getImperialUnitMultipleValue(FIELD_NAMES.IMPERIAL_WEIGHT_WITH_OZ, this.page)

        expect(actualSelectedValue).toStrictEqual(valueToSelect)
      })

    test(
      'Should render Imperial Weight with Oz field value on edit',
      async () => {
        const valueToSelect = ['1lb', '7oz']
        await selectImperialUnitMultipleValue(valueToSelect, FIELD_NAMES.IMPERIAL_WEIGHT_WITH_OZ, this.page)
        await createRecordAndOpenEditForm(PAGE_NAME, this.page)

        const actualSelectedValue = await getImperialUnitMultipleValue(FIELD_NAMES.IMPERIAL_WEIGHT_WITH_OZ, this.page)
        expect(actualSelectedValue).toStrictEqual(valueToSelect)
      })

    test(
      'Should select Imperial Height field value',
      async () => {
        const valueToSelect = ['2\'', '1\'\'']
        await selectImperialUnitMultipleValue(valueToSelect, FIELD_NAMES.IMPERIAL_HEIGHT, this.page)
        const actualSelectedValue = await getImperialUnitMultipleValue(FIELD_NAMES.IMPERIAL_HEIGHT, this.page)

        expect(actualSelectedValue).toStrictEqual(valueToSelect)
      })

    test(
      'Should render Imperial Height field value on edit',
      async () => {
        const valueToSelect = ['1\'', '3\'\'']
        await selectImperialUnitMultipleValue(valueToSelect, FIELD_NAMES.IMPERIAL_HEIGHT, this.page)
        await createRecordAndOpenEditForm(PAGE_NAME, this.page)

        const actualSelectedValue = await getImperialUnitMultipleValue(FIELD_NAMES.IMPERIAL_HEIGHT, this.page)
        expect(actualSelectedValue).toStrictEqual(valueToSelect)
      })
  })
})
