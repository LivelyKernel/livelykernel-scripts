/**
 * requestAnimationFrame polyfill by Erik Möller
 * Fixes from Paul Irish and Tino Zijdel
 * This version is taken from Justin Windle's sketch.js
 *
 * @see http://goo.gl/ZC1Lm
 * @see http://goo.gl/X0h6k
 * @see http://goo.gl/HIovX
 */
;(function(){for(var d=0,a=["ms","moz","webkit","o"],b=0;b<a.length&&!window.requestAnimationFrame;++b)window.requestAnimationFrame=window[a[b]+"RequestAnimationFrame"],window.cancelAnimationFrame=window[a[b]+"CancelAnimationFrame"]||window[a[b]+"CancelRequestAnimationFrame"];window.requestAnimationFrame||(window.requestAnimationFrame=function(b){var a=(new Date).getTime(),c=Math.max(0,16-(a-d)),e=window.setTimeout(function(){b(a+c)},c);d=a+c;return e});window.cancelAnimationFrame||(window.cancelAnimationFrame=function(a){clearTimeout(a)})})();