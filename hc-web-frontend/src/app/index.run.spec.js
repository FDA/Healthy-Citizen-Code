// describe('Run Stage', function() {
//   var controller
//     , sessionService;

//   beforeEach(function() {
//     module('fuse', bard.fakeToastr);

//     bard.inject('hcSessionService', '$rootScope', '$state', '$httpBackend');
//   });



//   it('should have Session service defined', function() {
//     inject(function(hcSessionService) {
//       expect(hcSessionService).to.be.defined;
//       expect(hcSessionService.setUser).to.be.defined;
//       expect(hcSessionService.getUser).to.be.defined;
//       expect(hcSessionService.setToken).to.be.defined;
//       expect(hcSessionService.getToken).to.be.defined;
//     });
//   });

//   it('should store user data', function() {
//     inject(function(hcSessionService) {
//       hcSessionService.setUser({
//         email       : 'test1@mail.com',
//         displayName : 'TestTest',
//         firstName   : 'Test',
//         lastName    : 'Test'
//       });

//       var user = hcSessionService.getUser();
//       expect(user).to.be.defined;
//       expect(user.email).to.be.equal('test1@mail.com');
//       expect(user.displayName).to.be.equal('TestTest');
//       expect(user.firstName).to.be.equal('Test');
//       expect(user.lastName).to.be.equal('Test');
//     });
//   });

//   it('should store token', function() {
//     inject(function(hcSessionService) {
//       hcSessionService.setToken('foobartesttest');

//       expect(hcSessionService.getToken()).to.be.equal('foobartesttest');
//     });
//   });

//   it('should check that token is empty', function() {
//     inject(function(hcSessionService) {

//       var token = hcSessionService.getToken();

//       expect(token).to.be.equal(null);
//     });
//   });

//   it('should redirect unauthorized users to login page', function() {
//     // responses mocking
//     $httpBackend.when('GET', /^.*.json/).respond({});
//     $httpBackend.when('GET', /^.*.html/).respond({});
//     $httpBackend.when('GET', /^.*alerts/).respond({});

//     // console.log($state.current, $state.go('app.homePage'));
//     $state.go('app.homePage');
//     $rootScope.$digest();
//     // .then(function () {
//     //   expect($state.current.name).to.be.defined;
//     // });
//     expect($state.current).to.be.defined;

//   });


//   afterEach(function() {
//     inject(function(hcSessionService) {
//       hcSessionService.setUser(null);
//       hcSessionService.setToken(null);
//     });
//   });
// });
