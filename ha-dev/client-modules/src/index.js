import '@babel/polyfill';
import { angularUIModule } from 'hc-ui-util';

import DrugInfoController from './controller/drug-info.controller';
import ProfileInfoController from './controller/profile-info.controller';
import NotificationPageController from './controller/notifications.controller';

import splViewerDirecrive from './directives/spl-viewer/spl-viewer.directive';

import HaApiService from './services/api.service';

angular.module('app.clientModules', [angularUIModule(angular)])
  .controller(...NotificationPageController)
  .controller(...DrugInfoController)
  .controller(...ProfileInfoController)
  .directive(...splViewerDirecrive)
  .factory(...HaApiService);
