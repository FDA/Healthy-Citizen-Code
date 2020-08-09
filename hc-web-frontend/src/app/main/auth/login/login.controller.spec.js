// describe('LoginController', function() {
//   var controller;

//   beforeEach(function() {
//     bard.appModule('ui.router');
//     bard.appModule('pascalprecht.translate');
//     bard.appModule('app.core');
//     bard.appModule('fuse');
//     bard.appModule('app.auth', bard.fakeToastr);
//     bard.appModule('app.auth.login', bard.fakeToastr);
//     bard.inject('$controller', '$rootScope', '$state');
//   });


//   beforeEach(function() {
//     var us = {};
//     controller = $controller('LoginController', {UserSchema: us});
//   });

//   it('should send correct data', function() {
//     controller.form = {
//       email    : 'user1@test.com',
//       password : 'qweqwe'
//     }

//     var response = controller.login();

//     expect(response).to.be.equal(controller.form);
//   });

// });
