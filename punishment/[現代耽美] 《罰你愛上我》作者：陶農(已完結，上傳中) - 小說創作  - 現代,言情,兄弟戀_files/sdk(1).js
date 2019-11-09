'use strict';
if (!('serviceWorker' in navigator)) throw Error("Service Worker isn't supported on this browser.");
if (!('PushManager' in window)) throw Error("Push isn't supported on this browser.");

const importer = {
    url: (url) => {
        return new Promise((resolve, reject) => {
            let script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = url;
            script.addEventListener('load', () => resolve(script), false);
            script.addEventListener('error', () => reject(script), false);
            document.body.appendChild(script);
        });
    },
    urls: (urls) => {
        return Promise.all(urls.map(importer.url));
    }
};
(function (config) {
    const WebPush = function (config) {
        const w = this;
        w.msg = {};
        let wp = null;

        w.init = () => {
            return initRequire().then(initScriptLoaded).then(tokenHandler).then(eventListener);
        };

        function log(msg, data = null) {
            !w.msg['info'] && (w.msg['info'] = [])
            w.msg['info'].push(msg);
            // DEBUG && data ? console.log(msg, data) : console.log(msg);
        }

        function error(msg, err) {
            !w.msg['err'] && (w.msg['err'] = [])
            w.msg['err'].push(err);
            // DEBUG && err ? console.error(msg, err) : console.error(msg);
        }

        function initRequire() {
            return importer.url("https://www.gstatic.com/firebasejs/4.11.0/firebase-app.js").then(() => {
                return importer.urls([
                    "https://www.gstatic.com/firebasejs/4.11.0/firebase-messaging.js",
                    config.server + "/scripts/mod/common.js",
                ]);
            });
        }

        function initScriptLoaded() {
            wp = new WP(config);

            function registerServiceWorker() {
                return navigator.serviceWorker.register('/service-worker.js')
                    .then(function (registration) {
                        registration.update(); // self-update service worker file
                        // console.log('Service worker successfully registered.');
                        return registration;
                    })
                    .catch(function (err) {
                        error('WebPush: Unable to register service worker.', err);
                    });
            }

            return registerServiceWorker().then(function (reg) {
                reg.update();

                firebase.initializeApp(config);
                const messaging = firebase.messaging();
                messaging.usePublicVapidKey(config.applicationServerPublicKey);
                messaging.useServiceWorker(reg);

                messaging.onTokenRefresh(function () {
                    messaging.getToken()
                        .then(function (refreshedToken) {
                            // console.log('Token refreshed.', refreshedToken);
                            wp.setTokenSentToServer(refreshedToken);
                        })
                        .catch(function (err) {
                            error('WebPush: Unable to retrieve refreshed token ', err);
                        });
                });

                messaging.onMessage(function (payload) {
                    log('WebPush: [sdk.js] Message received. ', payload);
                    const data = payload.data;
                    // log('WebPush: [sdk.js] payload.data', data);
                    wp.setImpression(JSON.parse(data.data));

                    const notify = wp.payloadToNotify(data);
                    // log('[sdk.js] notify', notify);
                    return reg.showNotification(notify.title, notify.opt);
                });

                return messaging;
            });
        }

        function tokenHandler(messaging) {
            return new Promise((res, rej) => {
                function getToken() {
                    return messaging.getToken()
                        .then(function (currentToken) {
                            log('currentToken', currentToken);
                            if (currentToken) wp.setTokenSentToServer(currentToken);
                            else {
                                // TODO Show permission UI.
                                // Show permission request.
                                log('No Instance ID token available. Request permission to generate one.');
                                // updateUIForPushPermissionRequired();
                                // TODO messaging.requestPermission()
                                // wp.setTokenSentToServer(false);
                            }
                        })
                        .catch(function (err) {
                            error('An error occurred while retrieving token. ', err);
                            // webpush.setTokenSentToServer(false);
                        });
                }

                function reqPermission(okCB, cancelCB) {
                    messaging.requestPermission()
                        .then(function () {
                            // console.log('Notification permission granted.');
                            getToken();
                            okCB && okCB();
                        })
                        .catch(function (err) {
                            cancelCB && cancelCB();
                            error('Unable to get permission to notify.', err);
                        });
                }

                /**
                 * TODO Permission UX
                 * https://web-push-book.gauntface.com/chapter-03/01-permission-ux/
                 */
                if (Notification.permission === 'granted') {
                    getToken().then(() => {
                        return res(wp);
                    })
                } else if (isApiExist('triggerReqPermission', 'function')) {
                    window.wpApi['triggerReqPermission'](reqPermission);
                } else {
                    reqPermission(
                        isApiExist('permissionGrantedCB', 'function') ? window.wpApi['permissionGrantedCB'] : null,
                        isApiExist('permissionOtherCB', 'function') ? window.wpApi['permissionOtherCB'] : null
                    );
                }
            });
        }

        function isApiExist(key, type) {
            return window.wpApi && (key in window.wpApi) && (typeof window.wpApi[key] === type);
        }

        function eventListener(wp) {
            !wp.user_token && error('WebPush: Unable to retrieve token ');

            isApiExist('allTopic', 'function') && wp.getAllTopic().then(window.wpApi['allTopic'])
            isApiExist('userTopic', 'function') && wp.getUserTopic().then(window.wpApi['userTopic'])
            isApiExist('userSaveTopic', 'function') && window.wpApi['userSaveTopic'](wp.userSaveTopic)

            isApiExist('useFCMToken', 'function') && window.wpApi['useFCMToken'](wp.user_token)
        }
    };
    "object" !== typeof config ? console.log("WebPush: configuration not found.") : (window.wpApi = window.wpApi || [], window.wp = new WebPush(config)), window.wp.init()
})(window.wpConfig || config); //向下相容
