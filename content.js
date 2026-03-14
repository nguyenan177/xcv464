// content.js — v6.16 — nút giải captcha nổi cố định

const SIM_KEY           = "okvip_sims";
const CURRENT_SIM_KEY   = "okvip_current_sim";
const API_KEY_STORE     = "okvip_api_key";
const CAPTCHA_KEY_STORE = "okvip_captcha_api_key";

const DEFAULT_API_KEY         = "ed7192f2d8bd0a6ee3b60a1915cc0084";
const DEFAULT_CAPTCHA_API_KEY = "7354dfda0562f14700d36f923868d5e7";

const WORKER          = "https://api.dblgamingg.workers.dev";
const SV2_BASE        = "https://noisy-darkness-b3aa.dblgamingg.workers.dev/api";
const ANTICAPTCHA_API = "https://anticaptcha.top/api/captcha";

const FIXED_SVC = 49;
const APP_ID    = 1200;


// =====================================================
// AUTO SET API KEY
// =====================================================

if(!localStorage.getItem(API_KEY_STORE))
  localStorage.setItem(API_KEY_STORE, DEFAULT_API_KEY);
if(!localStorage.getItem(CAPTCHA_KEY_STORE))
  localStorage.setItem(CAPTCHA_KEY_STORE, DEFAULT_CAPTCHA_API_KEY);


// =====================================================
// SMART INPUT DETECT
// =====================================================

function findPhoneInput(){
  const direct = document.querySelector('input[data-input-name="phone"]');
  if(direct) return direct;
  const tel = document.querySelector('input[type="tel"]');
  if(tel) return tel;
  const KW = /phone|mobile|sdt|sdт/i;
  const inputs = [...document.querySelectorAll('input[type="text"],input[type="number"]')];
  return inputs.find(el =>
    KW.test(el.placeholder||"") || KW.test(el.name||"") ||
    KW.test(el.id||"") || KW.test(el.getAttribute("data-input-name")||"") ||
    KW.test(el.getAttribute("aria-label")||"")
  ) || null;
}

function findOtpInput(){
  const KW = /otp|m[aã].? ?x[aá]c|verif|code|captcha|sms/i;
  const inputs = [...document.querySelectorAll('input[type="text"],input[type="number"],input[type="tel"]')];
  return inputs.find(el =>
    KW.test(el.placeholder||"") || KW.test(el.name||"") ||
    KW.test(el.id||"") || KW.test(el.getAttribute("data-input-name")||"") ||
    KW.test(el.getAttribute("aria-label")||"")
  ) || null;
}


// =====================================================
// UTILS
// =====================================================

const stripZero = p => p.startsWith("0") ? p.slice(1) : p;

function fillInput(el, val){
  if(!el) return false;
  el.focus(); el.select();
  try{
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value')?.set;
    if(setter) setter.call(el, val); else el.value = val;
  }catch(e){ el.value = val; }
  ['focus','input','change','blur'].forEach(ev =>
    el.dispatchEvent(new Event(ev,{bubbles:true,cancelable:true}))
  );
  ['keydown','keypress','keyup'].forEach(ev =>
    el.dispatchEvent(new KeyboardEvent(ev,{bubbles:true,cancelable:true}))
  );
  return true;
}

const getStorage = keys =>
  Promise.resolve(Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)])));
const setStorage = obj => {
  Object.entries(obj).forEach(([k,v])=>localStorage.setItem(k,v));
  return Promise.resolve();
};

function detectType(key){
  if(!key) return null;
  if(key.startsWith("eyJ") && key.split(".").length===3) return "okvip";
  if(/^[a-f0-9]{32}$/i.test(key)) return "sv2";
  return null;
}


// =====================================================
// LOAD HTML2CANVAS
// =====================================================

function loadHtml2Canvas(){
  return new Promise((resolve, reject) => {
    if(window.html2canvas){ resolve(window.html2canvas); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    s.onload  = () => resolve(window.html2canvas);
    s.onerror = () => reject(new Error('html2canvas load failed'));
    document.head.appendChild(s);
  });
}


// =====================================================
// CHỤP ẢNH CAPTCHA
// =====================================================

async function fetchImageBase64(src){
  try{
    const resp = await fetch(src, {mode:'cors'});
    const blob = await resp.blob();
    return new Promise(resolve => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result.split(',')[1]);
      r.onerror   = () => resolve(null);
      r.readAsDataURL(blob);
    });
  }catch(e){ return null; }
}

async function getBase64ForCaptcha(){
  // 1. Thử canvas đang hiển thị
  const canvases = [...document.querySelectorAll('canvas')]
    .filter(c => c.width > 100 && c.height > 100 && c.offsetParent)
    .sort((a,b) => (b.width*b.height)-(a.width*a.height));
  if(canvases.length){
    try{ return canvases[0].toDataURL('image/png').split(',')[1]; }catch(e){}
  }

  // 2. Thử img lớn nhất đang hiển thị
  const imgs = [...document.querySelectorAll('img')]
    .filter(i => i.offsetWidth > 100 && i.offsetHeight > 100 && i.offsetParent)
    .sort((a,b) => (b.offsetWidth*b.offsetHeight)-(a.offsetWidth*a.offsetHeight));
  if(imgs.length){
    const b64 = await fetchImageBase64(imgs[0].src);
    if(b64) return b64;
  }

  // 3. Fallback: chụp viewport bằng html2canvas
  try{
    const h2c = await loadHtml2Canvas();

    // Ẩn nút extension trước khi chụp
    const myBtns = [...document.querySelectorAll('[id^="okvip-"]')];
    myBtns.forEach(b => b.style.visibility = 'hidden');

    const canvas = await h2c(document.body, {
      useCORS: true, allowTaint: true, scale: 1,
      x: window.scrollX, y: window.scrollY,
      width: window.innerWidth, height: window.innerHeight,
      windowWidth: window.innerWidth, windowHeight: window.innerHeight,
    });

    myBtns.forEach(b => b.style.visibility = '');
    return canvas.toDataURL('image/png').split(',')[1];
  }catch(e){
    document.querySelectorAll('[id^="okvip-"]').forEach(b => b.style.visibility = '');
    return null;
  }
}


// =====================================================
// GỬI LÊN ANTICAPTCHA.TOP
// =====================================================

async function solveCaptcha(base64, type){
  const apiKey = localStorage.getItem(CAPTCHA_KEY_STORE) || DEFAULT_CAPTCHA_API_KEY;
  const resp = await fetch(ANTICAPTCHA_API, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ apikey: apiKey, img: base64, type })
  });
  return resp.json();
}


// =====================================================
// THỰC HIỆN KẾT QUẢ: CLICK TỌA ĐỘ HOẶC ĐIỀN TEXT
// =====================================================

async function executeSolution(captchaText){
  if(!captchaText) return false;
  const text = captchaText.trim();

  // Dạng tọa độ "x1,y1;x2,y2;..."
  const coords = [];
  const re = /(\d+)\s*,\s*(\d+)/g;
  let m;
  while((m = re.exec(text)) !== null) coords.push({x:+m[1], y:+m[2]});

  if(coords.length > 0){
    showToast(`🎯 Đang click ${coords.length} điểm...`, 'info');
    for(const {x, y} of coords){
      const el = document.elementFromPoint(x, y) || document.body;
      ['mousedown','mouseup','click'].forEach(ev =>
        el.dispatchEvent(new MouseEvent(ev, {bubbles:true, clientX:x, clientY:y}))
      );
      await new Promise(r => setTimeout(r, 600));
    }
    return true;
  }

  // Dạng text thuần → điền vào ô input
  const inp = findOtpInput();
  if(inp){ fillInput(inp, text); return true; }

  showToast(`📋 Kết quả: ${text}`, 'info');
  return false;
}


// =====================================================
// HANDLER NÚT GIẢI CAPTCHA
// =====================================================

async function handleSolveCaptcha(){
  const btn = document.getElementById('okvip-btn-captcha');
  if(btn){ btn.textContent = '⏳ Xử lý...'; btn.disabled = true; btn.style.background = '#6c757d'; }

  try{
    showToast('📸 Chụp ảnh captcha...', 'info');
    const base64 = await getBase64ForCaptcha();

    if(!base64){
      showToast('❌ Không chụp được ảnh', 'error');
      resetCaptchaBtn(); return;
    }

    showToast('🤖 Đang gửi giải...', 'info');

    // Thử type 51 (Recognition), nếu thất bại thử type 14 (Autodetect)
    let result = await solveCaptcha(base64, 51);
    if(!result?.success) result = await solveCaptcha(base64, 14);

    if(!result?.success){
      showToast(`❌ Thất bại: ${result?.message || 'Lỗi API'}`, 'error');
      resetCaptchaBtn(); return;
    }

    showToast(`✅ ${result.captcha}`, 'success');
    await executeSolution(result.captcha);

  }catch(e){
    showToast('❌ Lỗi: ' + e.message, 'error');
  }

  resetCaptchaBtn();
}

function resetCaptchaBtn(){
  const btn = document.getElementById('okvip-btn-captcha');
  if(!btn) return;
  btn.textContent = '🔓 Giải Captcha';
  btn.style.background = '#8b5cf6';
  btn.disabled = false;
}


// =====================================================
// API SIM / OTP
// =====================================================

async function callOkvip(path){
  return (await fetch(WORKER + path)).json();
}
async function callSv2(apiKey, params){
  return (await fetch(SV2_BASE + '?' + new URLSearchParams({apik:apiKey,...params}))).json();
}
async function cancelSim(sim, apiKey){
  try{
    if(sim.source === 'okvip') await callOkvip(`/cancel?api_key=${apiKey}&sim_id=${sim.simId}`);
    else await callSv2(apiKey, {act:'expired', id:sim.otpId});
  }catch(e){}
}
async function rentNewSim(apiKey, type){
  showToast('⏳ Đang thuê SIM...', 'info');
  for(let i = 0; i < 3; i++){
    try{
      if(type === 'okvip'){
        const d = await callOkvip(`/get-sim?api_key=${apiKey}&service_id=${FIXED_SVC}`);
        if(d?.status !== 200) continue;
        return { phone:d.data.phone, simObj:{source:'okvip',otpId:d.data.otpId,simId:d.data.simId,phone:d.data.phone,code:null,done:false} };
      }else{
        const d = await callSv2(apiKey, {act:'number', appId:APP_ID});
        if(d?.ResponseCode !== 0) continue;
        const phone = '0' + d.Result.Number;
        return { phone, simObj:{source:'sv2',otpId:d.Result.Id,simId:d.Result.Id,phone,code:null,done:false} };
      }
    }catch(e){}
    await new Promise(r => setTimeout(r, 1500));
  }
  showToast('❌ Kho số tạm hết', 'error');
  return null;
}

async function pollOtp(sim, apiKey, btn){
  const maxTry = 30; let count = 0;
  return new Promise(resolve => {
    const timer = setInterval(async() => {
      count++;
      if(count > maxTry){
        clearInterval(timer);
        btn.textContent = '⏰ Hết giờ'; btn.style.background = '#dc3545';
        resolve(null); return;
      }
      try{
        let code = null;
        if(sim.source === 'okvip'){
          const d = await callOkvip(`/get-otp?api_key=${apiKey}&otp_id=${sim.otpId}`);
          const m = (d?.data?.content||'').match(/\b\d{4,8}\b/);
          if(m) code = m[0];
        }else{
          const d = await callSv2(apiKey, {act:'code', id:sim.otpId});
          if(d?.ResponseCode === 0 && d?.Result?.Code) code = d.Result.Code;
        }
        if(code){
          clearInterval(timer);
          btn.textContent = `✅ OTP ${code}`; btn.style.background = '#28a745';
          fillInput(findOtpInput(), code);
          sim.code = code; sim.done = true;
          setStorage({[CURRENT_SIM_KEY]: JSON.stringify(sim)});
          resolve(code);
        }
      }catch(e){}
    }, 4000);
  });
}


// =====================================================
// HANDLERS SĐT / OTP
// =====================================================

function doFillPhone(phone){
  const phoneEl = findPhoneInput();
  setTimeout(() => {
    fillInput(phoneEl, stripZero(phone));
    setTimeout(() => { if(!phoneEl?.value) fillInput(phoneEl, phone); }, 500);
  }, 300);
}

async function handleFillPhoneClick(){
  const {[API_KEY_STORE]:apiKey,[CURRENT_SIM_KEY]:currentRaw} = await getStorage([API_KEY_STORE, CURRENT_SIM_KEY]);
  const type = detectType(apiKey);
  if(!apiKey || !type){ showToast('❌ API key lỗi', 'error'); return; }
  let currentSim = null;
  try{ currentSim = JSON.parse(currentRaw || 'null'); }catch(e){}
  const phoneEl = findPhoneInput();
  const isVerifyStep = /\d+\*\d+/.test(phoneEl?.placeholder || '');
  if(isVerifyStep){
    if(currentSim?.phone){ showToast(`♻️ Dùng lại ${currentSim.phone}`, 'info'); doFillPhone(currentSim.phone); }
    else showToast('❌ Chưa có SIM', 'error');
    return;
  }
  if(phoneEl?.value) fillInput(phoneEl, '');
  if(currentSim) await cancelSim(currentSim, apiKey);
  const res = await rentNewSim(apiKey, type);
  if(!res) return;
  setStorage({[CURRENT_SIM_KEY]: JSON.stringify(res.simObj)});
  showToast(`✅ ${res.phone}`, 'success');
  doFillPhone(res.phone);
}

async function handleOtpClick(){
  const {[CURRENT_SIM_KEY]:raw,[API_KEY_STORE]:apiKey} = await getStorage([CURRENT_SIM_KEY, API_KEY_STORE]);
  let sim = null;
  try{ sim = JSON.parse(raw || 'null'); }catch(e){}
  if(!sim){ showToast('❌ Chưa có SIM', 'error'); return; }
  const btn = document.getElementById('okvip-btn-otp');
  btn.textContent = '⏳ Đang chờ'; btn.style.background = '#6c757d';
  await pollOtp(sim, apiKey, btn);
}


// =====================================================
// INJECT NÚT VÀO INPUT
// =====================================================

function injectBtn(inputEl, id, label, color, handler){
  if(document.getElementById(id)) return;
  const parent = inputEl.parentElement;
  if(getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
  const btn = document.createElement('button');
  btn.id = id; btn.type = 'button'; btn.textContent = label;
  btn.style.cssText = `
    position:absolute;right:8px;top:50%;transform:translateY(-50%);
    z-index:9999;padding:4px 10px;background:${color};color:#fff;
    border:none;border-radius:6px;font-size:12px;font-weight:bold;cursor:pointer;
  `;
  btn.onclick = handler;
  parent.appendChild(btn);
}


// =====================================================
// NÚT GIẢI CAPTCHA NỔI CỐ ĐỊNH (luôn hiển thị ở góc)
// =====================================================

function injectFloatingCaptchaBtn(){
  if(document.getElementById('okvip-btn-captcha')) return;
  const btn = document.createElement('button');
  btn.id = 'okvip-btn-captcha';
  btn.type = 'button';
  btn.textContent = '🔓 Giải Captcha';
  btn.style.cssText = `
    position:fixed;
    bottom:70px;
    right:16px;
    z-index:2147483647;
    padding:10px 16px;
    background:#8b5cf6;
    color:#fff;
    border:none;
    border-radius:10px;
    font-size:13px;
    font-weight:bold;
    cursor:pointer;
    box-shadow:0 4px 14px rgba(0,0,0,0.35);
    -webkit-tap-highlight-color:transparent;
  `;
  btn.onclick = handleSolveCaptcha;
  document.body.appendChild(btn);
}


// =====================================================
// TOAST
// =====================================================

function showToast(msg, type){
  document.getElementById('okvip-toast')?.remove();
  const colors = {success:'#28a745', error:'#dc3545', info:'#007bff'};
  const t = document.createElement('div');
  t.id = 'okvip-toast'; t.textContent = msg;
  t.style.cssText = `
    position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
    z-index:2147483646;padding:10px 20px;border-radius:8px;
    font-size:13px;font-weight:bold;color:#fff;
    background:${colors[type]||'#333'};
    box-shadow:0 4px 12px rgba(0,0,0,0.3);
    white-space:nowrap;
  `;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}


// =====================================================
// INIT
// =====================================================

function tryInject(){
  const phone = findPhoneInput();
  if(phone){
    injectBtn(phone, 'okvip-btn-phone', '📲 Điền SĐT', '#ff6b00', handleFillPhoneClick);
    const isVerifyStep = /\d+\*\d+/.test(phone.placeholder || '');
    if(!phone.value && isVerifyStep){
      try{
        const sim = JSON.parse(localStorage.getItem(CURRENT_SIM_KEY) || 'null');
        if(sim?.phone){
          setTimeout(() => {
            if(!phone.value){
              fillInput(phone, stripZero(sim.phone));
              setTimeout(() => { if(!phone.value) fillInput(phone, sim.phone); }, 500);
            }
          }, 400);
        }
      }catch(e){}
    }
  }

  const otp = findOtpInput();
  if(otp) injectBtn(otp, 'okvip-btn-otp', '📨 Lấy OTP', '#28a745', handleOtpClick);

  // Nút giải captcha luôn nổi ở góc phải màn hình
  injectFloatingCaptchaBtn();
}

tryInject();

new MutationObserver(tryInject).observe(document.body, {childList:true, subtree:true});
