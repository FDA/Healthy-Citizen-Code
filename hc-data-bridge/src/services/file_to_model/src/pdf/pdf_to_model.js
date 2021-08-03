const fs = require('fs');
const _ = require('lodash');
const PDFParser = require('pdf2json');
const path = require('path');

class CdrhPdfParser {
  constructor (pdfPath, outputRawTextPath, resultJsonPath) {
    this.pdfPath = pdfPath;
    this.outputRawTextPath = outputRawTextPath;
    this.resultJsonPath = resultJsonPath;

    this.result = {};
    this.state = {
      isInstructionsStringBegin: false,
      isQuestionBuilt: false,
    };
    this.currentQuestion = this._createQuestionTemplate();

    this.questionBeginningRegex = /^\d+[a-z]?\..+$/;
    this.instructionsRegex = /^INSTRUCTIONS:.+$/;
    this.datePageRegex = /^\d\/\d\/\d{4} \d{1,2}:\d{2} (PM|AM)\d+ of \d+$/;
    this.dateRegex = /^\d\/\d\/\d{4} \d{1,2}:\d{2} (PM|AM)$/;
    this.pageRegex = /^\d+ of \d+$/;
    this.pageBreakRegex = /-+Page \(\d+\) Break-+/;

    this.stringsToSkip = [
      'Protocol: Patient-Reported Outcomes with LASIK 2 (PRWL2A) http://test/wfb/downloadReportList.action?location=WFBReports/Output...',
      'Production - Release 2.0',
      '[$site code]  User:',
      'Pre-Operative Questionnaire (PRQ)',
      'Web Version: 1.0; 1.00; 06-04-15',
    ];
  }

  _createQuestionTemplate () {
    return {
      Name: null,
      Question: [], // might consist of multiple strings
      Type: null, // 'Single Choice',
      Options: [],
      FHIRResource: null,
      FHIRFieldPath: null,
    };
  }

  parse () {
    const pdfParser = new PDFParser(this, 1);
    pdfParser.on('pdfParser_dataError', errData => console.error(errData.parserError));

    pdfParser.on('pdfParser_dataReady', (pdfData) => {
      fs.writeFileSync(this.outputRawTextPath, pdfParser.getRawTextContent());
      this._parseRawText();
    });

    pdfParser.loadPDF(this.pdfPath);
  }

  _parseRawText () {
    const lineReader = require('readline').createInterface({ input: fs.createReadStream(this.outputRawTextPath) });

    lineReader.on('line', (line) => {
      // console.log(line);
      line = line.trim();
      // skip not valuable line and beginning of pages
      if (this.isValuableLine(line)) {
        return;
      }

      if (this.questionBeginningRegex.test(line)) {
        // 1. Find new question
        this.saveQuestionToResult();
        this.prepareNewQuestion(line);
      } else if (this.state.isInstructionsStringBegin || this.instructionsRegex.test(line)) {
        // 2. Skip instructions string
        this.state.isInstructionsStringBegin = true;
      } else if (this.state.isQuestionBuilt === false) {
        // 3. Add question part if its consist of 2+ strings
        this.currentQuestion.Question.push(line);
        if (this.isQuestionBuilt(line)) {
          this.state.isQuestionBuilt = true;
        }
      } else {
        // 4. Add answer options
        this.currentQuestion.Options.push(line);
      }
    });

    lineReader.on('close', () => {
      this.postProcess();
      fs.writeFileSync(this.resultJsonPath, JSON.stringify(this.result, null, 2));

      // Write big json files
      // const JSONStream = require("JSONStream").stringifyObject("{",",","}");
      // JSONStream.pipe(fs.createWriteStream(this.resultJsonPath))
      //
      // for(var key in this.result) {
      //   JSONStream.write([key,this.result[key]]);
      // }
      //
      // JSONStream.end();
    });
  }

  prepareNewQuestion (line) {
    this.clearState();

    this.currentQuestion = this._createQuestionTemplate();
    const indexOfDot = line.indexOf('.');
    this.currentQuestion.Name = line.substring(0, indexOfDot);
    const questionPart = line.substring(indexOfDot + 1).trim();
    this.currentQuestion.Question.push(questionPart);
    if (this.isQuestionBuilt(questionPart)) {
      this.state.isQuestionBuilt = true;
    }
  }

  clearState () {
    this.state.isInstructionsStringBegin = false;
    this.state.isQuestionBuilt = false;
  }

  isValuableLine (line) {
    return !line || this.stringsToSkip.includes(line) || this.isDateOrPageLine(line) || this.pageBreakRegex.test(line);
  }

  isDateOrPageLine (line) {
    return this.datePageRegex.test(line) || this.dateRegex.test(line) || this.pageRegex.test(line);
  }

  isQuestionBuilt (line) {
    return line.endsWith('?') || line.endsWith(':') ||
      (line.startsWith('(') && (line.endsWith(')') || line.endsWith(').')));
  }

  saveQuestionToResult () {
    if (this.currentQuestion.Name !== null) {
      const questionName = this.currentQuestion.Name;
      this.result[questionName] = this.currentQuestion;
      delete this.result[questionName].Name;
      delete this.result[questionName].isQuestionBuilt;
    }
  }

  postProcess () {
    _.forEach(this.result, (val, key) => {
      if (val.Question.length > 1 && val.Options.length === 0) {
        val.Options = val.Question.splice(1, val.Question.length - 1);
      }
      val.Question = val.Question.join('');
    });
  }
}

const pdfPath = path.resolve(__dirname, './resources/Pre-Op Questionnaire.pdf');
const outputRawTextPath = path.resolve(__dirname, './generated/model/Pre-Op Questionnaire-raw.txt');
const resultJsonPath = path.resolve(__dirname, '../generated/model/Pre-Op Questionnaire.json');
const cdrhPdfParser = new CdrhPdfParser(pdfPath, outputRawTextPath, resultJsonPath);
cdrhPdfParser.parse();
