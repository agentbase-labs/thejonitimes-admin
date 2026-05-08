/* TheJoniTimes beacon — collects path + referrer + session id.
 * Safe to serve from any origin. No PII. */
(function(){
  try {
    var BEACON = (window.__TJT_ADMIN_BEACON__) ||
                 ((document.currentScript && document.currentScript.src) ?
                   document.currentScript.src.replace(/\/b\.js.*$/, '/api/beacon') :
                   'https://admin.thejonitimes.com/api/beacon');
    var ref = document.referrer || '';
    var path = location.pathname + location.search;
    var sid;
    try { sid = localStorage.getItem('_tjt_sid'); } catch (e) {}
    if (!sid) {
      sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
      try { localStorage.setItem('_tjt_sid', sid); } catch (e) {}
    }
    var payload = JSON.stringify({ path: path, referrer: ref, sid: sid, ts: Date.now() });
    var sent = false;
    if (navigator.sendBeacon) {
      try {
        sent = navigator.sendBeacon(BEACON, new Blob([payload], { type: 'application/json' }));
      } catch (e) {}
    }
    if (!sent) {
      fetch(BEACON, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
        mode: 'cors',
        credentials: 'omit',
      }).catch(function(){});
    }
  } catch (e) {}
})();
