// describe('RegisterController', function() {
//   var controller;

//   beforeEach(function() {
//     bard.appModule('ui.router');
//     bard.appModule('pascalprecht.translate');
//     bard.appModule('app.core');
//     bard.appModule('fuse');
//     bard.appModule('app.auth', bard.fakeToastr);
//     bard.appModule('app.auth.register', bard.fakeToastr);
//     bard.inject('$controller', '$rootScope', '$state');
//   });

//   beforeEach(function() {
//     var us = {data: {}};
//     controller = $controller('RegisterController', {UserSchema: us});
//   });


//   describe('Register controller', function() {
//     it('should be created successfully', function() {
//       expect(controller).to.be.defined;
//     });

//     it('should send correct user data', function() {
//       controller.user = {
//         'firstName'   : 'Ppp',
//         'lastName'    : 'ppp',
//         'email'       : 'ppp@ppp.com',
//         'password'    : 'qweqwe',
//         'displayName' : 'Pppppp',
//       }

//       controller.user.repeatPassword = 'qweqwe';

//       var user = controller.createUser();

//       // displayName
//       expect(user).to.have.property('displayName');
//       expect(user.displayName).to.be.equal(user.firstName + user.lastName);

//       // created / updated
//       expect(user).to.have.property('created');
//       expect(user).to.have.property('updated');

//     });

//     it ('should add error when password not confirmed', function () {
//       controller.user = {
//         'firstName'   : 'Ppp',
//         'lastName'    : 'ppp',
//         'email'       : 'ppp@ppp.com',
//         'password'    : 'qweqwe',
//         'displayName' : 'Pppppp',
//       }

//       controller.repeatPassword = '111111';

//       var error = controller.createUser();
//       // console.log(error);
//       expect(error[0]).to.be.equal("Passwords does't match");
//     });

//   });

// });
