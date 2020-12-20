/*global
XMLHttpRequest, window
*/

(function () {
    "use strict";
    var ajax = {};

    ajax.get = function ajaxGet(url, callback) {
        var req = new XMLHttpRequest();
        req.onreadystatechange = function () {
            if (req.readyState === XMLHttpRequest.DONE) {
                if (parseInt(req.status, 10) === 200) {
                    var response = null;
                    try {
                        response = JSON.parse(req.responseText);
                    } catch (ignore) {}
                    callback(req.responseText, response);
                } else if (parseInt(req.status, 10) === 400) {
                    console.error("Ajax 400 error", req);
                } else {
                    console.error("Ajax non-200 error", req);
                }
            }
        };

        req.open("GET", url, true);
        req.send();
    };

    if (window) {
        window.ajax = ajax;
    } else {
        console.error("ajax instantiation failed");
    }
}());
