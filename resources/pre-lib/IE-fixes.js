(function addIEPatches() {
    var isIE = window.navigator && window.navigator.userAgent.indexOf("MSIE") > -1;
    if (!isIE) return;

    // enable IE9 mode
    var meta = document.createElement('meta')
    meta.setAttribute('http-equiv', "X-UA-Compatible")
    meta.setAttribute('content', "IE=9")
    document.getElementsByTagName('head')[0].appendChild(meta);

    // support for func.name
    Function.prototype.__defineGetter__('name', function() {
        var source = String(this);
        return source.split(/[\s\(]/g)[1];
    });
})();