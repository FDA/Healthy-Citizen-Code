/**
 * GET /
 * Home page.
 */
exports.index = (req, res) => {
  res.json({
  	"title": "homepage",
  	"dexcription": "HC project"
  });
};
