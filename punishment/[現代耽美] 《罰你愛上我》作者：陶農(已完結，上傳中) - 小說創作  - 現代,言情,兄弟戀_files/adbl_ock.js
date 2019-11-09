function adbSetCookie(cname, cvalue, exdays) {
    var d           = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    var expires     = 'expires=' + d.toUTCString();
    document.cookie = cname + '=' + cvalue + ';' + expires + ';path=/';
}

function adbGetCookie(cname) {
    var name = cname + '=';
    var ca   = document.cookie.split(';');
    for(var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return '';
}

var status_now    = (typeof window.atrk === 'undefined') ? 1 : 0;
var status_cookie = parseInt(adbGetCookie('adb_status'), 10);

if (status_now !== status_cookie) {
    var ajax = new XMLHttpRequest();
    ajax.open("POST", window.location.origin + "/api.php?mod=ajax&api=updateAdblockStatus", true);
    ajax.onreadystatechange = function() {};
    
    ajax.send(JSON.stringify({uid: dz_uid, status: status_now}));

    adbSetCookie('adb_status', status_now, 7);
}
