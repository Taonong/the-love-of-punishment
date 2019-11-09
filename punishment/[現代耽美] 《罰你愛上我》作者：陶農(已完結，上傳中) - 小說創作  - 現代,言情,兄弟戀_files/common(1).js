'use strict';
if (typeof DEBUG === "undefined") {
    var DEBUG = false;
}

if (typeof IDB === "undefined") {
    var IDB = function (root, site_id) {
        const DB_NAME = 'WebPushStorage';
        const DB_VERSION = 1;
        const DB_STORE_NAME = 'Store' + site_id;

        const a = this;

        let openDB = new Promise((res, rej) => {
            const req = root.indexedDB.open(DB_NAME, DB_VERSION);
            req.onsuccess = (evt) => {
                const db = evt.target.result;
                const tx = db.transaction(DB_STORE_NAME, 'readwrite');
                // remove expire_time is expire
                const range = root.IDBKeyRange.upperBound(new Date());
                tx.objectStore(DB_STORE_NAME)
                    .index('expire_time')
                    .openCursor(range)
                    .onsuccess = (e) => {
                    const cursor = e.target.result;
                    if (!cursor) return;
                    DEBUG && console.log('deleting: ' + cursor.key);
                    cursor.delete();
                    cursor.continue();
                };

                res(db);
            };
            req.onerror = (evt) => {
                console.error("openDb on error:", evt.target.errorCode);
                rej();
            };
            req.onupgradeneeded = (evt) => {
                DEBUG && console.log("openDb.onupgradeneeded");
                const store = evt.currentTarget.result.createObjectStore(
                    DB_STORE_NAME, {keyPath: 'id', autoIncrement: true});
                store.createIndex('key', 'key', {unique: true});
                // store.createIndex('value', 'value', {unique: false});
                store.createIndex('expire_time', 'expire_time', {unique: false});
            };
        });

        function choiceMode(db, mode) {
            // 'readwrite'
            return new Promise((res, rej) => {
                const tx = db.transaction(DB_STORE_NAME, mode);
                const store = tx.objectStore(DB_STORE_NAME);
                res(store);
            });
        }

        function find(store, key, value) {
            return new Promise((res, rej) => {
                const req = store.index(key);
                req.get(value).onsuccess = (evt) => {
                    res({store: store, obj: evt.target.result});
                };
                req.onerror = (evt) => {
                    console.error("find on error:", evt.target.errorCode);
                };
            });
        }

        a.all = function () {
            return openDB.then(db => choiceMode(db, 'readonly'))
                .then(store => {
                    return new Promise((res, rej) => {
                        const ret = [];
                        const req = store.openCursor();
                        req.onsuccess = function (evt) {
                            const cursor = evt.target.result;
                            if (cursor) {
                                ret.push(evt.target.result.value);
                                cursor.continue();
                            }
                            return res(ret);
                        };
                    });
                });
        };

        a.set = function (key, value, expire_sec) {
            const expire_time = new Date();
            expire_time.setTime(expire_time.getTime() + (expire_sec * 1000));
            DEBUG && console.log("add arguments:", arguments);

            const obj = {key: key, value: value, expire_time: expire_time};

            openDB.then(db => choiceMode(db, 'readwrite'))
                .then(store => find(store, 'key', key))
                .then(ret => {
                    return new Promise((res, rej) => {
                        if (!ret.obj) {
                            // new
                            const req = ret.store.put(obj);
                            req.onsuccess = function (evt) {
                                DEBUG && console.log("Insertion in DB successful");
                            };
                        } else {
                            // check
                            DEBUG && console.log("Obj in DB");
                        }
                        res(true);
                    });
                });
        };

        a.get = function (key) {
            return openDB.then(db => choiceMode(db, 'readonly'))
                .then(store => find(store, 'key', key))
                .then(x => {
                    return new Promise((res, rej) => {
                        res((x.obj) ? x.obj.value : '');
                    });
                });
        };

        a.del = function (key) {
            DEBUG && console.log("del arguments:", arguments);
            return openDB.then(db => choiceMode(db, 'readwrite'))
                .then(store => find(store, 'key', key))
                .then(ret => {
                    return new Promise((res, rej) => {
                        ret.obj && ret.store.delete(ret.obj.id);
                    });
                });
        };

        a.clearDB = function () {
            openDB.then(db => choiceMode(db, 'readwrite'))
                .then(store => {
                    store.clear();
                });
        };
    };
}


if (typeof Store === "undefined") {
    var Store = function (site_id) {
        const a = this;
        let store_api;
        init();

        a.set = function (key, value, expire_sec) {
            return store_api.set(key, value, expire_sec);
        };

        a.get = function (key) {
            return store_api.get(key);
        };

        a.del = function (key) {
            return store_api.del(key);
        };

        function init() {
            if (typeof window !== 'undefined') {
                // // In the following line, you should include the prefixes of implementations you want to test.
                // window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
                // // DON'T use "var indexedDB = ..." if you're not in a function.
                // // Moreover, you may need references to some window.IDB* objects:
                // window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
                // window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;
                // // (Mozilla has never prefixed these objects, so we don't need window.mozIDB*)

                store_api = new IDB(window, site_id);
            } else {
                store_api = new IDB(self, site_id);
            }

            // // TODO use other way to store data on the client
            // console.error("Your browser doesn't support a stable version of IndexedDB. Such and such feature will not be available.");
        }
    };
}

if (typeof WP === "undefined") {
    var WP = function (config) {
        const api = config.server + '/api';
        const store = new Store(config.site_id);
        const a = this;
        a.client = {country: '', platform: '', browser: ''};
        a.client.platform = navigator.userAgent.match(/mobile/i) ? 'Mobile' : navigator.userAgent.match(/iPad|Android|Touch/i) ? 'Tablet' : 'Desktop';
        a.client.browser = getBrowser();
        a.device_token = '';
        a.user_token = '';

        a.setConsent = (consent) => {
            consent();
        };

        a.setTokenSentToServer = (token) => {
            const postData = {};
            !a.user_token && (postData['old_user_token'] = a.user_token);
            a.user_token = token;
            if (a.user_token) {
                Promise.all([
                    getDeviceToken(),
                ]).then(ret => {
                    const postData = {};
                    postData['site_id'] = config.site_id;
                    postData['device_token'] = a.device_token;
                    postData['user_token'] = a.user_token;
                    postData['browser'] = a.client.browser;
                    postData['platform'] = a.client.platform;
                    postData['geo'] = a.client.country;
                    postData['status'] = Notification.permission;
                    post(api + '/l/permission', postData);
                });
            }
        };

        a.setImpression = (data) => {
            Promise.all([
                getDeviceToken(),
            ]).then(ret => {
                DEBUG && console.log(data);
                const postData = {};
                postData['site_id'] = config.site_id;
                postData['schedule_id'] = data.schedule_id;
                postData['device_token'] = a.device_token;
                post(api + '/l/impression', postData);
            });
        };

        a.setAction = (data) => {
            Promise.all([
                getDeviceToken(),
            ]).then(ret => {
                DEBUG && console.log(data);
                const postData = {};
                postData['site_id'] = config.site_id;
                postData['schedule_id'] = data.schedule_id;
                postData['device_token'] = a.device_token;
                postData['action'] = data.action;
                post(api + '/l/click', postData);
            });
        };

        a.getAllTopic = () => {
            const postData = {};
            postData['site_id'] = config.site_id;
            postData['device_token'] = a.device_token;
            postData['user_token'] = a.user_token;
            return post(api + '/b/getAllTopic', postData);
        };

        a.getUserTopic = () => {
            return Promise.all([
                getDeviceToken(),
            ]).then(ret => {
                DEBUG && console.log(ret);
                const postData = {};
                postData['site_id'] = config.site_id;
                postData['device_token'] = a.device_token;
                postData['user_token'] = a.user_token;
                return post(api + '/b/getUserTopic', postData);
            });
        };

        a.userSubTopic = (id, isSub = true) => {
            return Promise.all([
                getDeviceToken(),
            ]).then(ret => {
                DEBUG && console.log(id, isSub);
                const postData = {};
                postData['site_id'] = config.site_id;
                postData['device_token'] = a.device_token;
                postData['user_token'] = a.user_token;
                postData['ta_id'] = id;
                postData['is_sub'] = isSub;
                return post(api + '/b/userSubTopic', postData);
            });
        };

        a.userSaveTopic = (ids) => {
            return Promise.all([
                getDeviceToken(),
            ]).then(ret => {
                DEBUG && console.log(ids);
                const postData = {};
                postData['site_id'] = config.site_id;
                postData['device_token'] = a.device_token;
                postData['user_token'] = a.user_token;
                postData['ta_id'] = ids;
                return post(api + '/b/userSaveTopic', postData);
            });
        };

        function getDeviceToken() {
            return store.get('device_token')
                .then(x => {
                    if (x) {
                        a.device_token = x;
                        return a.device_token;
                    } else {
                        return get(api + '/b/deviceToken?site_id=' + config.site_id).then(ret => {
                            if (ret.result) {
                                a.device_token = ret.data.device_token;
                                store.set('device_token', a.device_token, getDeviceTokenExpireSec());
                                return ret.data.device_token;
                            }
                        });
                    }
                });
        }

        function get(url) {
            return fetch(url, {mode: 'cors'})
                .then(ret => {
                    return ret.json();
                });
        }

        function post(url, data) {
            return fetch(url, {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            }).then(function (response) {
                if (!response.ok) throw new Error('Bad status code from server.');
                return response.json();
            }).then(function (responseData) {
                if (!responseData.result) throw new Error('Bad response from server.');
                return responseData;
            });
        }

        function getBrowser() {
            if (typeof window === 'undefined') return;
            // Opera 8.0+
            let isOpera = (!!window.opr && !!opr.addons) || !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;
            // Firefox 1.0+
            let isFirefox = typeof InstallTrigger !== 'undefined';
            // Safari 3.0+ "[object HTMLElementConstructor]"
            let isSafari = /constructor/i.test(window.HTMLElement) || (function (p) {
                return p.toString() === "[object SafariRemoteNotification]";
            })(!window['safari'] || (typeof safari !== 'undefined' && safari.pushNotification));
            // Internet Explorer 6-11
            let isIE = /*@cc_on!@*/false || !!document.documentMode;
            // Edge 20+
            let isEdge = !isIE && !!window.StyleMedia;
            // Chrome 1+
            let isChrome = !!window.chrome && !!window.chrome.webstore;
            // Blink engine detection
            let isBlink = (isChrome || isOpera) && !!window.CSS;
            // console.log(isOpera, isFirefox, isSafari, isChrome, isIE, isEdge);
            return isChrome ? 'Chrome' : isEdge ? 'Edge' : isIE ? 'IE' : isSafari ? 'Safari' : isFirefox ? 'Firefox' : isOpera ? 'Opera' : 'Other';
        }

        function getDeviceTokenExpireSec() {
            const now = new Date();
            now.setTime(now.getTime() + 8 * 3600000);
            const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getUTCDate() + 1);
            tomorrow.setTime(tomorrow.getTime() + 8 * 3600000);
            return parseInt((tomorrow.getTime() - now.getTime()) / 1000);
        }

        a.payloadToNotify = (payload) => {
            /**
             * ref: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification
             */
            let notifyTitle = 'Web Push BG';
            let notifyOpt = {
                body: 'Background Message body.' + (new Date().toTimeString()),
            };

            if ('title' in payload) notifyTitle = payload.title;
            if ('body' in payload) notifyOpt.body = payload.body;
            if ('icon' in payload) notifyOpt.icon = payload.icon;
            if ('click_action' in payload) notifyOpt.click_action = payload.click_action;

            if ('image' in payload) notifyOpt.image = payload.image;
            // if ('badge' in payload) notifyOpt.badge = payload.badge;
            if ('actions' in payload) notifyOpt.actions = JSON.parse(payload.actions);
            if ('data' in payload) notifyOpt.data = JSON.parse(payload.data);

            if ('tag' in payload) notifyOpt.tag = payload.tag;
            if ('renotify' in payload) notifyOpt.renotify = payload.renotify;
            if ('silent' in payload) notifyOpt.silent = payload.silent;

            return {title: notifyTitle, opt: notifyOpt}
        };
    };
}
