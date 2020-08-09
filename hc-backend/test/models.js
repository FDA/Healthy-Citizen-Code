const chai = require('chai');
const expect = chai.expect;
const User = require('./../models/pii_data');
const modelInstanceGenerator = require('./../generators/model_instance_generator').modelInstanceGenerate;

const generator = require('./../generators/model_instance_generator');
const modelsJson = require('./../src/data_model/model-v2.json');

const model = generator.modelInstanceGenerate(modelsJson.models.pii, "mongoose");

let userObj = modelInstanceGenerator(model, "instance");
userObj.email = 'testtest@gmail.com';
userObj.password = '111';


describe('User Model', () => {
  it('should create a new user', (done) => {
    
    let user = new User(userObj);
    user.save(function (err) {
      expect(err).to.be.null;
      expect(user.email).to.equal(userObj.email);
      done();
    });
  });

  it('should not create a user with the not unique email', (done) => {
    const user = new User(userObj);
    user.save((err) => {
      expect(err).to.be.defined;
      expect(err.code).to.equal(11000);
      done();
    });
  });

  it('should find user by email', (done) => {
    User.findOne({ email: userObj.email }, (err, user) => {
      expect(err).to.be.null;
      expect(user.email).to.equal(userObj.email);
      done();
    });
  });

  it('should delete a user', (done) => {
    User.remove({ email: userObj.email}, (err) => {
      expect(err).to.be.null;
      done();
    });
  });
});
