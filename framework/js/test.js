(function () {

    'use strict';

    angular.module('test', [])
        .directive('test', function () {
            return {
                restrict: 'A',
                replace: true,
                template: '<div>hi</div>'
            }
        })
})();

