const status = document.getElementById('offline-status');
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
if (status && (isIOS || standalone)) {
  status.hidden = false;
  status.textContent = '正在准备离线游玩…';
}

function showState(ready) {
  if (!status) return;
  status.textContent = ready ? '已可离线游玩' : '请保持联网，正在保存游戏…';
}

if ('serviceWorker' in navigator && isSecureContext && location.protocol !== 'file:') {
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data?.type === 'OFFLINE_READY') showState(true);
    if (event.data?.type === 'NOT_READY') showState(false);
  });
  const check = worker => worker?.postMessage({type: 'CHECK_OFFLINE_READY'});
  navigator.serviceWorker.addEventListener('controllerchange', () => check(navigator.serviceWorker.controller));
  navigator.serviceWorker.register('./sw.js', {scope: './', updateViaCache: 'none'})
    .then(() => navigator.serviceWorker.ready)
    .then(registration => check(registration.active))
    .catch(() => {
      if (status) status.textContent = '离线资源尚未准备好，请联网后重新打开';
    });
}
