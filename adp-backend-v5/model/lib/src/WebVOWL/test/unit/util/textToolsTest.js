describe("Truncating of text", function () {
	let tools;

	beforeEach(function () {
		tools = require("../../../src/webvowl/js/util/textTools")();
	});

	it("should not truncate too short strings", function() {
		const text = "The text length is OK";
			const maxWidth = 1000;

		const truncatedText = tools.truncate(text, maxWidth);

		expect(truncatedText).toBe(text);
	});

	it("should truncate too long strings", function() {
		const text = "This text is too long";
			const maxWidth = 4;

		const truncatedText = tools.truncate(text, maxWidth, null, 0);

		expect(truncatedText).not.toBe(text);
		expect(truncatedText.length).toBeLessThan(text.length);
	});

	it("should append three dots when truncating", function() {
		const text = "This text is waaaaaaaaaay too long";
			const maxWidth = 100;

		const truncatedText = tools.truncate(text, maxWidth);

		expect(truncatedText).not.toBe(text);
		expect(truncatedText).toMatch(/.+\.\.\.$/);
	});
});
