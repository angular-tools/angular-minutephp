(function () {
    'use strict';

    var m = angular.module('session', ['ngDialog', 'angular-loading-bar']);
    var loaded = false;
    var rootScopeArray = [];
    var serviceInstance = null;

    m.config(['ngDialogProvider', function (ngDialogProvider) {
        ngDialogProvider.setDefaults({className: 'ngdialog-theme-plain'});
    }]);

    m.provider('$session', function () {
        var user = null, site = null, providers = null, request = null, user_data = null;

        this.load = function (data) {
            loaded = true;

            angular.forEach(data, function (v, k) {
                if (k == 'user') {
                    user = v;
                } else if (k == 'site') {
                    site = v;
                } else if (k == 'providers') {
                    providers = v;
                } else if (k == 'request') {
                    request = v;
                }
            });
        };

        this.$get = ['$q', '$http', '$timeout', 'ngDialog', '$window', '$rootScope', function ($q, $http, $timeout, $dialog, $window, $rootScope) {
            rootScopeArray.push($rootScope);

            if (serviceInstance) {
                return serviceInstance;
            }

            serviceInstance = {};

            var host = '//' + top.location.host;

            var loginPopupURL = host + '/_auth/login_popup';
            var signupPopupURL = host + '/_auth/signup_popup';
            var createPwPopupURL = host + '/_auth/create_password_popup';
            var forgotPwPopupURL = host + '/_auth/forgot_password_popup';
            var completeSignupPopupURL = host + '/_auth/complete_signup_popup';

            var sessionLoadURL = host + '/_auth/get_session_data';
            var userDataURL = host + '/_auth/user_data';
            var userTzUpdateURL = host + '/_auth/set_user_info';

            var hybridauthURL = host + '/_auth/hybridauth?provider=';
            var loginURL = host + '/_auth/login';
            var logoutURL = host + '/_auth/logout';
            var registerURL = host + '/_auth/signup';
            var completeSignupURL = host + '/_auth/signup_complete';
            var createPasswordURL = host + '/_auth/create-password';
            var forgotPasswordURL = host + '/_auth/forgot-password';

            var triggerEventURL = host + '/_auth/trigger_user_event';

            var popupDefaults = {className: 'ngdialog-theme-plain'};

            serviceInstance.logout = function (redirectTo) {
                $http.get(logoutURL).then(function () {
                    serviceInstance.setSessionData({user: null}, 'logout');

                    if (angular.isString(redirectTo)) {
                        top.location.href = redirectTo;
                    }
                }, function () {
                    top.location.href = logoutURL;
                });
            };

            serviceInstance.login = function (msg) {
                return serviceInstance.loadSession().then(function () {return showLoginPopup(msg);});
            };

            serviceInstance.signup = function (msg) {
                return serviceInstance.loadSession().then(function () {return showSignupPopup(msg);});
            };

            serviceInstance.forgotPassword = function (msg) {
                return serviceInstance.loadSession().then(function () {return showForgotPasswordPopup(msg);});
            };

            serviceInstance.createPassword = function (msg) {
                return serviceInstance.loadSession().then(function () {return showCreatePasswordPopup(msg);});
            };

            serviceInstance.socialLogin = function (provider) {
                var url = hybridauthURL + provider;
                window.open(url, "hybridauth_social_sing_on", "location=0,status=0,scrollbars=0,width=640,height=480"); //(/\=Facebook/.test(url) ?
            };


            var showLoginPopup = function (msg) {
                return $dialog.open(angular.extend(popupDefaults, {
                    template: loginPopupURL,
                    closeByDocument: false,
                    data: {url: loginURL, updateSession: true, msg: msg},
                    controller: ['$scope', popupController]
                }));
            };

            var showSignupPopup = function (msg) {
                return $dialog.open(angular.extend(popupDefaults, {
                    template: signupPopupURL,
                    closeByDocument: false,
                    data: {url: registerURL, updateSession: true, msg: msg},
                    controller: ['$scope', popupController]
                }));
            };

            var showCompleteSignupPopup = function (title, msg, cta) {
                return $dialog.open(angular.extend(popupDefaults, {
                    template: completeSignupPopupURL,
                    showClose: false,
                    closeByEscape: false,
                    closeByDocument: false,
                    data: {url: completeSignupURL, title: title, msg: msg, cta: cta, updateSession: true},
                    controller: ['$scope', popupController]
                }));
            };

            var showForgotPasswordPopup = function (msg) {
                return $dialog.open(angular.extend(popupDefaults, {
                    template: forgotPwPopupURL,
                    closeByDocument: false,
                    data: {url: forgotPasswordURL, msg: msg},
                    controller: ['$scope', popupController]
                }));
            };

            var showCreatePasswordPopup = function (msg) {
                return $dialog.open(angular.extend(popupDefaults, {
                    template: createPwPopupURL,
                    closeByDocument: false,
                    data: {url: createPasswordURL, msg: msg},
                    controller: ['$scope', popupController]
                }));
            };

            serviceInstance.loadSession = function () {
                var deferred = $q.defer();

                if (!loaded) {
                    loaded = true;
return;
                    $http.get(sessionLoadURL).then(function (result) {
                        serviceInstance.setSessionData(result.data);
                        deferred.resolve();
                    });
                } else {
                    $timeout(deferred.resolve);
                }

                return deferred.promise;
            };

            serviceInstance.setSessionData = function (data, event) {
                var allowed = ['user', 'site', 'request', 'providers'];

                angular.forEach(data, function (v, k) {
                    if (allowed.indexOf(k) !== -1) {
                        serviceInstance[k] = v;

                        for (var i = 0; i < rootScopeArray.length; i++) {
                            rootScopeArray[i].$broadcast("session_" + k + "_update", angular.extend({event: event}, v));
                        }
                    }
                });

                $timeout($dialog.closeAll);
            };

            serviceInstance.setLoginPopupURL = function (url) {
                loginPopupURL = url;
            };

            serviceInstance.getLoginPopupURL = function () {
                return loginPopupURL;
            };

            serviceInstance.setSignupPopupURL = function (url) {
                signupPopupURL = url;
            };

            serviceInstance.getSignupPopupURL = function () {
                return signupPopupURL;
            };

            serviceInstance.setPopupDefaults = function (thePopupDefaults) {
                popupDefaults = thePopupDefaults;
            };

            serviceInstance.triggerEvent = function (eventName, eventData) {
                return $http.post(triggerEventURL, {eventName: eventName, eventData: eventData});
            };

            serviceInstance.onSessionStart = function () {
                var user = serviceInstance.getUser();
                var show = user && user.user_id > 0;
                var clsShow = show > 0 ? '.visible-members' : '.visible-non-members';
                var clsHide = !(show > 0) ? '.visible-members' : '.visible-non-members';

                angular.element(document).find(clsHide).hide();
                angular.element(document).find(clsShow).show();

                if (user && user.user_id > 0 && ((user.tz_offset === null) || (user.ip_addr === null))) {
                    user.tz_offset = (new Date()).getTimezoneOffset();
                    $http.post(userTzUpdateURL, {tz: user.tz_offset});
                }
            };

            serviceInstance.getUser = function () {
                return (angular.isObject(serviceInstance['user']) && (serviceInstance['user']['user_id'] > 0)) ? serviceInstance['user'] : null;
            };

            serviceInstance.getUserData = function (key) {
                var deferred = $q.defer();

                if (user_data && (!key || (typeof(user_data[key]) !== 'undefined'))) {
                    deferred.resolve(key ? user_data[key] : user_data);
                } else {
                    $http.get(userDataURL).then(function (obj) {
                        user_data = obj.data;
                        deferred.resolve(key ? user_data[key] : user_data);
                    });
                }

                return deferred.promise;
            };

            serviceInstance.setUserData = function (data) {
                var promise = $http.post(userDataURL, {data: data});
                promise.then(function (obj) {
                    user_data = obj.data;
                });

                return promise;
            };

            serviceInstance.checkRegistration = function (title, msg, cta) {
                var deferred = $q.defer();

                if (serviceInstance.hasOwnProperty('user') && serviceInstance.user.hasOwnProperty('email') && serviceInstance.user.email) {
                    $timeout(deferred.resolve);
                } else {
                    serviceInstance.removeRegistrationWatch = $rootScope.$on('session_user_update', function (user) {
                        deferred.resolve(serviceInstance['user']);
                        serviceInstance.removeRegistrationWatch();
                    });

                    showCompleteSignupPopup(title, msg, cta);
                }

                return deferred.promise;
            };

            serviceInstance.cookie = function (name, value, days) {
                if (typeof(value) === 'undefined') {
                    var nameEQ = name + "=";
                    var ca = document.cookie.split(';');
                    for (var i = 0; i < ca.length; i++) {
                        var c = ca[i];
                        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
                        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
                    }

                    return null;
                } else {
                    var expires = "";

                    if (days > 0) {
                        var date = new Date();
                        date.setTime(date.getTime() + Math.round(days * 24 * 60 * 60 * 1000));
                        expires = "; expires=" + date.toGMTString();
                    } else if (days < 0) {
                        expires = "; expires=Thu, 01 Jan 1970 00:00:01 GMT";
                    }

                    document.cookie = name + "=" + value + expires + "; path=/; domain=." + serviceInstance.site.domain;
                }
            };

            var basename = function (url) { return url ? url.split('/').pop() : '';};

            var popupController = function ($scope) {
                var data = $scope.ngDialogData;
                //console.log("data: ", data);

                $scope.providers = serviceInstance.providers;
                $scope.socialLogin = serviceInstance.socialLogin;
                $scope.loading = false;
                $scope.project = {};

                $scope.submit = function () {
                    var promise = $q.defer().promise;

                    if ($scope.form.$valid) {
                        $scope.loading = true;
                        $scope.success = $scope.error = '';

                        if (promise = $http.post(data.url, {data: $scope.project})) {
                            promise.then(
                                function (result) {
                                    if (data.updateSession) {
                                        serviceInstance.setSessionData(result.data, basename(data.url));
                                    } else if (result.data && result.data.response) {
                                        $scope.success = result.data.response;
                                    }

                                    $scope.loading = false;
                                },
                                function (error) {
                                    $scope.error = error.data || 'Server error. Please try later.';
                                    $scope.loading = false;
                                });
                        }
                    } else {
                        $scope.error = 'All fields are required.';
                    }

                    return promise;
                };

                $scope.autoFocus = function (a) {
                    var autofocus = $('input[data-auto-focus="true"]');

                    if (autofocus.length > 0) {
                        autofocus.get(0).focus();
                    }
                };

                $scope.switchTemplate = function (name) {
                    $scope.closeThisDialog();
                    return name == 'signup' ? showSignupPopup() : name == 'login' ? showLoginPopup() : showForgotPasswordPopup();
                };

                serviceInstance.setError = function (error) {
                    $timeout(function () {
                        $scope.error = error;
                    });
                };

                $timeout($scope.autoFocus, 1000);
            };

            $window.sessionManager = serviceInstance;
            $timeout(serviceInstance.loadSession);

            $rootScope.$on('session_user_update', serviceInstance.onSessionStart);

            serviceInstance.setSessionData({user: user, site: site, request: request, providers: providers});

            return serviceInstance;
        }];
    });

    return m;
})();