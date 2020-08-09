const Generator = {
	generateDigits: numberOfDigits => {
		if (numberOfDigits === undefined){
			numberOfDigits = 6;
		}

		const max = Math.pow(10, numberOfDigits);
		const min = Math.pow(10, numberOfDigits - 1) + 1;

		return Math.floor(Math.random() * (max - min) + min);
	}
}

module.exports = Generator;