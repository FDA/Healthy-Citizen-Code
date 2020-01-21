async function waitForGridLoaded(page) {
  await page.waitForSelector('.dx-loadpanel.dx-state-invisible');
}

module.exports = {
  waitForGridLoaded,
}
