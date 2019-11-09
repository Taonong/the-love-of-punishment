const wpConfig = {server: "https://push.ckck.fun",site_id: "96b0669f64ebdfeed7a803fa3e07a0d3",origin: "https://ck101.com",messagingSenderId: "1089095071977",applicationServerPublicKey: "BC6jDABO8QyQQLhvgQMg9qJk7wqHqS0LY5_JKPdFaeE-xFMQPNVyIWIiL9jvqF76GgnifAeTY3wwOYsJLcZ-M6U"}
try {
    window.wpConfig = wpConfig || [];
    var container = document.body ? document.body : document.head;
    var wpsdk = document.createElement("script");
    wpsdk.id = "web-push-jsapi", wpsdk.src = wpConfig.server + "/scripts/sdk.js", wpsdk.async = true, container.appendChild(wpsdk)
} catch (err) {
}
