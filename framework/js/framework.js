(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        // CommonJS
        module.exports = factory(require('angular'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD
        define(['angular'], factory);
    } else {
        // Global Variables
        factory(root.angular);
    }
}(this, function (angular, undefined) {
    'use strict';

    var m = angular.module('minutephp', ['session', 'notice', 'http-auth-interceptor']);

    m.config(['$httpProvider', function ($httpProvider) {
        $httpProvider.defaults.headers.common["X-Requested-With"] = 'XMLHttpRequest';
    }]);

    m.provider('$minutephp', function () {
        var defaults = this.defaults = {};

        this.setDefaults = function (newDefaults) {
            angular.extend(defaults, newDefaults);
        };

        this.$get = ['$rootScope', '$q', '$http', '$timeout', '$session', '$notice', '$window', '$browser', 'authService',
            function ($rootScope, $q, $http, $timeout, $session, $notice, $window, $browser, authService) {
                var serviceInstance = {};

                serviceInstance.ModelArray = function () {
                    var that = this;

                    var parent = null;
                    var child = null;
                    var joinKey = null;

                    var maxPage = 0;
                    var minPage = 0;
                    var totalItems = 0;
                    var itemsPerPage = 0;
                    var name = 'ModelArray';
                    var offset = 9999;

                    var $more = false;
                    var $less = false;

                    this.setParent = function (theParent) {
                        parent = theParent;
                    };

                    this.getParent = function () {
                        return parent;
                    };

                    this.setTotalItems = function (count) {
                        totalItems = parseInt(count);
                        this.updateTotalItems(0);
                    };

                    this.updateTotalItems = function (delta) {
                        totalItems += delta;
                    };

                    this.setItemsPerPage = function (theItemsPerPage) {
                        itemsPerPage = theItemsPerPage;
                    };

                    this.getItemsPerPage = function () {
                        return itemsPerPage > 0 ? itemsPerPage : 20;
                    };

                    this.setOffset = function (theOffset) {
                        offset = Math.min(theOffset, offset);

                        $timeout(function () {
                            var page = Math.floor(theOffset / that.getItemsPerPage());
                            maxPage = Math.max(maxPage, page);
                            minPage = Math.min(minPage, page);

                            $less = minPage > 0;
                            $more = maxPage < that.getTotalPages();
                        });
                    };

                    this.getOffset = function () {
                        return offset;
                    };

                    this.getTotalItems = function () {
                        return totalItems;
                    };

                    this.setChild = function (theChild) {
                        child = theChild;
                    };

                    this.getChild = function () {
                        return child;
                    };

                    this.setJoinKey = function (theJoinKey) {
                        joinKey = theJoinKey;
                    };

                    this.getJoinKey = function () {
                        return joinKey;
                    };

                    this.setName = function (theName) {
                        name = theName;
                    };

                    this.getName = function () {
                        return name;
                    };

                    this.createChild = function (data) {
                        var newChild = new child;

                        if (data) {
                            newChild.extend(data);
                        }

                        newChild.setParent(that);
                        that.push(newChild);

                        return newChild;
                    };

                    this.loadNextPage = function (replace) {
                        if (maxPage < that.getTotalPages()) {
                            that.loadPage(maxPage + 1, replace);
                        } else {
                            console.log("already on last page: ", maxPage, that.getTotalPages());
                        }
                    };

                    this.getTotalPages = function () {
                        return Math.max(0, -1 + (this.getTotalItems() / this.getItemsPerPage()));
                    };

                    this.loadPage = function (page, replace) {
                        var prefix_url = serviceInstance.getPrefixURL(that, 'read');
                        var read_url = prefix_url + this.getName() + '/' + page;

                        this.loadFromURL(read_url);
                    };

                    this.loadFromURL = function (url, data, replace) {
                        var promise = $http.get(url, data || {});
                        promise.then(function (result) {
                            $timeout(function () {
                                if (replace) {
                                    that.length = 0;
                                }

                                serviceInstance.load(that, result.data[that.getName()]);
                            });
                        });

                        return promise;
                    };

                    this.setAll = function (k, v) {
                        angular.forEach(this, function (child, index) {
                            child.set(k, v);
                        });

                        return that;
                    };

                    this.getAll = function (k) {
                        var result = [];
                        angular.forEach(that, function (child, index) {
                            result.push(child.get(k));
                        });

                        return result;
                    };

                    this.saveAll = function (onSuccess, onError) {
                        return that._bulkOp('save', onSuccess, onError);
                    };

                    this.removeAll = function (onSuccess, onError) {
                        return that._bulkOp('remove', onSuccess, onError);
                    };

                    this._bulkOp = function (op, onSuccess, onError) {
                        var promises = [], promise, deferred;

                        angular.forEach(that, function (child, index) {
                            if (child.hasOwnProperty(op)) {
                                promises.push(child[op]());
                            }
                        });

                        if (promises.length > 0) {
                            promise = $q.all(promises);
                        } else {
                            deferred = $q.defer();
                            promise = deferred.promise;
                            $timeout(function () { deferred.resolve(that);});
                        }

                        promise.then(arg(onSuccess), arg(angular.isUndefined(onError) && angular.isString(onSuccess) ? $notice.defaultError : onError, 'error'), null);

                        return promise;
                    };

                    this.more = function () {
                        return $more;
                    };

                    this.less = function () {
                        return $less;
                    };
                };

                serviceInstance.ModelArray.prototype = [];
                serviceInstance.ModelArray.prototype.create = function (data) {
                    return this.createChild(data);
                };

                serviceInstance.Model = function () {
                    var that = this;
                    var parent = null;
                    var modelName = null;
                    var PK = null;
                    var name = 'Model';
                    var monitorFunc = null;
                    var theData = {};

                    this.setParent = function (theParent) {
                        parent = theParent;
                    };

                    this.getParent = function () {
                        return parent;
                    };

                    this.setModel = function (theModel) {
                        modelName = theModel;
                    };

                    this.getModel = function () {
                        return modelName;
                    };

                    this.setName = function (theName) {
                        name = theName;
                    };

                    this.getName = function () {
                        return name;
                    };

                    this.setPK = function (thePK) {
                        PK = thePK;
                    };

                    this.getPK = function () {
                        return PK;
                    };

                    this.getPKValue = function () {
                        return typeof(that[that.getPK()]) !== 'undefined' ? that[that.getPK()] : 0;
                    };

                    this.setParentPK = function () {
                        var parent, joinKey;

                        if (parent = that.getParent()) {
                            if (joinKey = parent.getJoinKey()) {
                                if (!that.get(joinKey)) {
                                    var parentID = parent.getParent().get(joinKey);

                                    if (parentID > 0) {
                                        that.set(joinKey, parentID);
                                    } else {
                                        var pName = parent.getParent().getName();
                                        throw new Error('"' + pName + '" (parent) does not have a primary key. To create children, please call $scope.' + pName + '.save() first');
                                    }
                                }
                            }
                        }
                    };

                    this.set = function (k, v) {
                        var val = serviceInstance.normalize(k, v);

                        if (angular.isObject(val) && angular.isObject(that[k])) {
                            angular.extend(that[k], val);
                        } else {
                            that[k] = val;
                        }

                        $timeout(function () {});
                        return that;
                    };

                    this.get = function (k) {
                        return typeof(that[k]) !== 'undefined' ? that[k] : '';
                    };

                    this.unset = function (k) {
                        delete(that[k]);

                        return that;
                    };

                    this.serialize = function () {
                        serviceInstance.clearObject(theData); //clear old object but preserve reference

                        angular.forEach(that, function (v, k) {
                            if (v instanceof Date) {
                                theData[k] = serviceInstance.toMySQLDate(v);
                            } else if (angular.isObject(v) && (/\_json$/.test(k))) {
                                theData[k] = angular.toJson(v);
                            } else if (!angular.isFunction(v) && !angular.isObject(v) && (k.indexOf('$') !== 0)) {
                                theData[k] = v;
                            }
                        });

                        return theData;
                    };

                    this.post = function (cmd) {
                        var data = {cmd: cmd, model: that.getModel(), data: that.serialize()};

                        console.log("POST URL: ", serviceInstance.getSelfURL(), "data: ", data);
                        return $http.post(serviceInstance.getSelfURL(), data);
                    };

                    this.clone = function () {
                        var copy = that.getParent().createChild();

                        if (copy instanceof serviceInstance.Model) {
                            var serialized = that.serialize();
                            var ignoreKeys = ['created_at', that.getPK()];

                            angular.forEach(ignoreKeys, function (k) {
                                delete(serialized[k]);
                            });

                            serviceInstance.load(copy, serialized);
                        }

                        return copy;
                    };

                    this.save = function (onSuccess, onError) {
                        var oldPKValue = that.getPKValue();
                        var myParent = that.getParent();
                        var insert = !oldPKValue;
                        var isChild = !!myParent.getParent();

                        if (isChild) {
                            that.setParentPK();
                        }

                        var promise = that.post('save');
                        var deferred = $q.defer();

                        promise.then(function (result) {
                                console.log("pass: ", result, insert, oldPKValue);
                                that.extend(result.data);

                                if (insert) {
                                    that.getParent().updateTotalItems(+1);
                                    that.refresh();
                                }

                                $timeout(function () {
                                    that.$dirty = false;
                                    that.monitor();
                                });

                                deferred.resolve(that);
                            },
                            function (fail) {
                                console.log("fail: ", fail);
                                return deferred.reject(fail);
                            }
                        );

                        promise.then(arg(onSuccess), arg(angular.isUndefined(onError) && angular.isString(onSuccess) ? $notice.defaultError : onError, 'error'), null);

                        return deferred.promise;
                    };

                    this.remove = function (onSuccess, onError) {
                        var parent = that.getParent();
                        var childIndex = parent.indexOf(that);
                        var promise;

                        if (childIndex != -1) {
                            parent.splice(childIndex, 1);
                        }

                        if (that.getPKValue()) { //unsaved item
                            promise = that.post('remove');
                            promise.then(function (result) {
                                    that.getParent().updateTotalItems(-1);

                                    return $q.when(result);
                                },
                                function (fail) {
                                    parent.splice(childIndex, 0, that);

                                    return $q.reject(fail);
                                })
                                .then(arg(onSuccess), arg(angular.isUndefined(onError) && angular.isString(onSuccess) ? $notice.defaultError : onError, 'error'));
                        } else {
                            var deferred = $q.defer();
                            promise = deferred.promise;
                            promise.then(arg(onSuccess), arg(angular.isUndefined(onError) && angular.isString(onSuccess) ? $notice.defaultError : onError, 'error'));

                            $timeout(function () {
                                deferred.resolve(that);
                            });
                        }

                        return promise;
                    };

                    /**
                     * Change the browser's URL from /0 to /[pk] after successful save.
                     * Does not working with $location: https://github.com/angular-ui/ui-router/issues/562
                     *
                     * @param onSuccess
                     * @param onError
                     * @returns {*}
                     */
                    this.saveAndRedirect = function (onSuccess, onError) {
                        var promise = this.save(onSuccess, onError);

                        if (!that.getPKValue()) {
                            promise.then(function () {
                                var selfURL = serviceInstance.getSelfURL();

                                if (/\/0$/.test(selfURL)) {
                                    var self_href = window.location.href;
                                    var new_url = self_href.replace(/\/edit\/0/, '/edit/' + that.getPKValue());

                                    if (new_url !== selfURL) {
                                        $rootScope.$on('$routeChangeStart', function (event) {
                                            event.preventDefault();
                                        });

                                        serviceInstance.setSelfURL(new_url);
                                        $timeout(function () {
                                            window.history.pushState({}, "URL updated by smart save", new_url);
                                        });
                                    }
                                }
                            });
                        }

                        return promise;
                    };

                    this.removeConfirm = function (confirmMsg, onSuccess, onError) {
                        return $notice.confirm(confirmMsg || 'Are you sure?').then(function () {
                                that.remove(onSuccess, onError);
                            }
                        );
                    };

                    this.refresh = function () {
                        var prefix_url = serviceInstance.getPrefixURL(that, 'refresh');
                        var refresh_url = prefix_url + this.getName() + '/' + that.get(that.getPK());

                        console.log(refresh_url);
                        $http.get(refresh_url, {}).then(function (result) {
                            $timeout(function () {
                                console.log("refresh: ", result);
                                if (result && result.data && (typeof(result.data[that.getName()]) !== 'undefined') && (typeof(result.data[that.getName()][1]) !== 'undefined')) {
                                    serviceInstance.load(that, result.data[that.getName()][1]);
                                }
                            });
                        });
                    };

                    this.dirty = function () {
                        if (typeof(monitorFunc) !== 'function') {
                            this.monitor();
                        }

                        return typeof(that.$dirty) !== 'undefined' ? that.$dirty : false;
                    };

                    this.monitor = function () {
                        that.$dirty = false;

                        if (typeof(monitorFunc) === 'function') { //just in case
                            monitorFunc();
                        }

                        monitorFunc = $rootScope.$watch(that.serialize, function (newValue, oldValue) {
                            if (!angular.equals(newValue, oldValue)) {
                                that.$dirty = true;
                                monitorFunc();
                            }
                        }, true);
                    };

                    this.extend = function (obj) {
                        angular.forEach(obj, function (v, k) {
                            that.set(k, v);
                        });
                    }
                };

                serviceInstance.Model.prototype = {};

                serviceInstance.getPrefixURL = function (that, prefix) {
                    var prefixes = [];
                    var myParent = that;

                    while (myParent = myParent.getParent()) {
                        if (myParent instanceof serviceInstance.Model) {
                            prefixes.unshift(myParent.getName() + '/' + myParent.get(myParent.getPK()));
                        }
                    }

                    return rtrim((rtrim(serviceInstance.getSelfURL(), '/') + '/' + prefix + '/' + prefixes.join('/')), '/') + '/';
                };

                serviceInstance.setSelfURL = function (url) {
                    serviceInstance.selfURL = url;
                };

                serviceInstance.getSelfURL = function () {
                    return serviceInstance.selfURL;
                };

                serviceInstance.normalize = function (k, v) {
                    var dateMatch;

                    if (/\_at$/.test(k) && angular.isString(v) && (dateMatch = v.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/))) { //ignore timezone
                        return new Date(Date.parse(dateMatch[0]));
                    } else if (/\_json$/.test(k) && angular.isString(v)) {
                        return angular.fromJson(v);
                    }

                    return v;
                };

                serviceInstance.init = function (f) {
                    f();
                };

                serviceInstance.load = function (ref, obj) {
                    if (angular.isArray(obj)) {
                        for (var i = 0; i < obj.length; i++) {
                            var val = obj[i];
                            if (ref instanceof serviceInstance.ModelArray) {
                                if (val.hasOwnProperty('$metadata')) {
                                    delete(val['$metadata']);

                                    angular.forEach(val, function (v, k) {
                                        var name = k.charAt(1).toUpperCase() + k.slice(2);
                                        ref['set' + name](v);
                                    });
                                } else {
                                    var child = ref.createChild();
                                    //child.setParent(ref);
                                    //ref.push(child);
                                    serviceInstance.load(child, val);
                                }
                            } else {
                                if (!val.hasOwnProperty('$metadata')) {
                                    ref.push(val);
                                }
                            }
                        }
                    } else if (angular.isObject(obj)) {
                        angular.forEach(obj, function (v, k) {
                            if (angular.isObject(v)) {
                                var modelArr = k + "Array";
                                if (typeof(serviceInstance[modelArr]) !== 'undefined') {
                                    ref[k] = new serviceInstance[modelArr](ref instanceof serviceInstance.Model ? ref : null);
                                    serviceInstance.load(ref[k], v);
                                } else {
                                    if (typeof(ref[k]) !== 'undefined') {
                                        angular.forEach(v, function (val, key) {
                                            if (!angular.isObject(val)) {
                                                ref[k][key] = serviceInstance.normalize(key, val);
                                            } else {
                                                ref[k][key] = angular.isArray(val) ? [] : {};
                                                serviceInstance.load(ref[k][key], val);
                                            }
                                        });
                                    } else {
                                        console.log("ref: ", ref, k, v);
                                        ref[k] = v;
                                    }
                                }
                            } else {
                                ref[k] = serviceInstance.normalize(k, v);
                            }
                        });
                    }
                };

                serviceInstance.clearObject = function (obj, data) {
                    for (var i in obj) {
                        if (obj.hasOwnProperty(i)) {
                            delete(obj[i]);
                        }
                    }

                    return obj;
                };

                serviceInstance.import = function (scope, init, data) {
                    serviceInstance.init(init);
                    serviceInstance.load(scope, data);
                };

                serviceInstance.toMySQLDate = function (dateobj) {
                    return dateobj instanceof Date ? dateobj.toISOString().slice(0, 19).replace('T', ' ') : '';
                };

                var rtrim = function (str, char) {
                    return str.replace(new RegExp((char || ' ') + '+$'), '');
                };

                var ltrim = function (str, char) {
                    return str.replace(new RegExp('^' + (char || ' ') + '+'), '');
                };

                var arg = function (f, type) {
                    return (typeof(f) === 'string') ? $notice.promise(f, type) : f;
                };

                $rootScope.session = $session;

                $rootScope.$on('event:auth-loginRequired', function () {
                    $session.login();
                });

                $rootScope.$on('session_user_update', function () {
                    authService.loginConfirmed();
                });

                $rootScope.import = function (init, data) {
                    serviceInstance.import.call(this, this, init, data);
                };

                serviceInstance.setSelfURL('//' + location.host + location.pathname);

                return serviceInstance;
            }];
    });

    m.directive('minuteHelp', [function () {
        return {
            restrict: 'A',
            replace: true,
            transclude: true,
            scope: {minuteHelp: '@'},
            template: '<a href="" ng-href="{{\'//minutephp.com/help/\' + minuteHelp}}" target="_blank"><ng-transclude></ng-transclude></a>'
        };
    }]);

    return m;
}));
