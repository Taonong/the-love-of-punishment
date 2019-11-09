window.QGSettings = {
   "origin": "https://ck101.com", 
   "personalizationEnabled": true, 
   "inWebEnabled": true, 
   "push": {
      "useNotifyEndpoint": false, 
      "restrictOrigin": false, 
      "requestSelf": false, 
      "delay": 0, 
      "fakePrompt": false, 
      "onSubscribedPopup": {
         "enabled": false, 
         "showOverlay": true, 
         "htmlBody": ""
      }, 
      "secondsBetweenPrompts": 3600
   }, 
   "qgendpoint": "https://.aiqua.io/notify.html", 
   "appId": "2379619faa489c3f96bc", 
   "debug": false
};
if(window.qg && window.qg.queue) {
    window.qg.queue.unshift(('init', QGSettings));
}
!function(q,g,r,a,p,h,js){
    if(!q.qg){
        js=q.qg=function() {
            js.callmethod ? js.callmethod.call(js, arguments) : js.queue.push(arguments);
            js.queue = [];
        }
    }
    if(q.qg.initialized){return;}
    window.qg.queue.unshift(['init',window.QGSettings])
    p=g.createElement(r);
    p.async=!0;
    p.src=a;
    h=g.getElementsByTagName(r)[0];
    h.parentNode.insertBefore(p,h);
    q.qg.initialized = true;
}(window,document,'script','//cdn.qgraph.io/v3/r/aiqua.js');

