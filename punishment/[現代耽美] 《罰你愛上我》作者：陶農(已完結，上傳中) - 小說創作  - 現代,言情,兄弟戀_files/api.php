
if (typeof window['insertScript'] !== 'function') {
    window['insertScript'] = function(oriScript, callback) {
        var s = document.createElement('script');
        s.type = 'text/javascript';

        if (oriScript.src) {
            s.onload = callback;
            s.onerror = callback;
            s.src = oriScript.src;
        } else {
            s.textContent = oriScript.innerText;
        }

        if (!!oriScript.parentNode) {
            oriScript.parentNode.appendChild(s);
            oriScript.parentNode.removeChild(oriScript);
        } else
            container.appendChild(s);

        if (!oriScript.src)
            callback()
    };
}

if (typeof window['seq'] !== 'function') {
    window['seq'] = function(arr, callback, index) {
        if (typeof index === 'undefined')
            index = 0;

        arr[index](function() {
            index++;
            if (index == arr.length)
                callback();
            else
                seq(arr, callback, index);
        });
    };
}

if (typeof window['runScripts'] !== 'function') {
    window['runScripts'] = function(container, scriptName) {
        var scripts = container.querySelectorAll('script');
        var runList = [];

        [].forEach.call(scripts, function(theScript) {
            runList.push(function(callback) {
                insertScript(theScript, callback);
            });
        });

        if (runList.length > 0)
        	var CSS_LOG = ["color: #fff;", "background: #2ca1f1;", "display: inline-block;", "padding: 1px 4px;", "border-radius: 3px;"].join(" ")
            seq(runList, function() { console.log('%cCKAD', CSS_LOG, 'API Load:', scriptName); });
    };
}

(function() {
	var container = document.getElementById('ck_custom_1650');
	if (!container) return;
	container.innerHTML = '';
    runScripts(container, 'ck_custom_1650');
})();