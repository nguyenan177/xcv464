// content.js — v6.15 — thêm nút giải captcha anticaptcha.top

const SIM_KEY         = "okvip_sims";
const CURRENT_SIM_KEY = "okvip_current_sim";
const API_KEY_STORE   = "okvip_api_key";
const CAPTCHA_KEY_STORE = "okvip_captcha_api_key";

const DEFAULT_API_KEY         = "ed7192f2d8bd0a6ee3b60a1915cc0084";
const DEFAULT_CAPTCHA_API_KEY = "7354dfda0562f14700d36f923868d5e7";

const WORKER   = "https://api.dblgamingg.workers.dev";
const SV2_BASE = "https://noisy-darkness-b3aa.dblgamingg.workers.dev/api";
const ANTICAPTCHA_API = "https://anticaptcha.top/api/captcha";

const FIXED_SVC = 49;
const APP_ID    = 1200;


// =====================================================
// AUTO SET API KEY
// =====================================================

if(!localStorage.getItem(API_KEY_STORE)){
  localStorage.setItem(API_KEY_STORE, DEFAULT_API_KEY);
}
if(!localStorage.getItem(CAPTCHA_KEY_STORE)){
  localStorage.setItem(CAPTCHA_KEY_STORE, DEFAULT_CAPTCHA_API_KEY);
}


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
    KW.test(el.placeholder||"") ||
    KW.test(el.name||"") ||
    KW.test(el.id||"") ||
    KW.test(el.getAttribute("data-input-name")||"") ||
    KW.test(el.getAttribute("aria-label")||"")
  ) || null;
}


function findOtpInput(){
  const KW = /otp|m[aã].? ?x[aá]c|verif|code|captcha|sms/i;
  const inputs = [...document.querySelectorAll('input[type="text"],input[type="number"],input[type="tel"]')];
  return inputs.find(el =>
    KW.test(el.placeholder||"") ||
    KW.test(el.name||"") ||
    KW.test(el.id||"") ||
    KW.test(el.getAttribute("data-input-name")||"") ||
    KW.test(el.getAttribute("aria-label")||"")
  ) || null;
}


// =====================================================
// CAPTCHA DETECT
// =====================================================

function findCaptchaContainer(){
  // Tìm captcha dạng click-theo-thứ-tự (có ảnh lớn + các icon nhỏ)
  const selectors = [
    '.captcha-container',
    '.captcha-wrapper',
    '[class*="captcha"]',
    '[id*="captcha"]',
    'canvas[id*="captcha"]',
    'img[src*="captcha"]',
    // OKVIP specific
    '.verify-wrap',
    '.verify-img-out',
    '.verify-body',
  ];

  for(const sel of selectors){
    const el = document.querySelector(sel);
    if(el) return el;
  }

  // Fallback: tìm modal/dialog đang hiển thị có chứa ảnh
  const modals = [...document.querySelectorAll('div[class*="modal"],div[class*="dialog"],div[class*="popup"]')]
    .filter(el => el.offsetParent !== null && el.querySelector('img,canvas'));
  if(modals.length) return modals[0];

  return null;
}


function findCaptchaImage(){
  // Tìm ảnh captcha chính (ảnh lớn có các icon trên đó)
  const selectors = [
    '.verify-img-out img',
    '.verify-body img',
    '[class*="captcha"] img',
    '[id*="captcha"] img',
    'img[src*="captcha"]',
    'img[class*="captcha"]',
  ];
  for(const sel of selectors){
    const el = document.querySelector(sel);
    if(el && el.width > 100) return el;
  }

  // Fallback: ảnh lớn nhất trong modal
  const container = findCaptchaContainer();
  if(container){
    const imgs = [...container.querySelectorAll('img')].sort((a,b) => (b.width*b.height) - (a.width*a.height));
    if(imgs.length) return imgs[0];
  }
  return null;
}


function findCaptchaClickArea(){
  // Tìm vùng có thể click (canvas hoặc div chứa các icon)
  return document.querySelector('.verify-img-out, .verify-body, [class*="captcha-img"], canvas[id*="captcha"]')
    || findCaptchaContainer();
}


// =====================================================
// UTILS
// =====================================================

const stripZero = p => p.startsWith("0") ? p.slice(1) : p;


function fillInput(el, val){
  if(!el) return false;

  el.focus();
  el.select();

  try{
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    if(setter) setter.call(el, val);
    else el.value = val;
  }catch(e){ el.value = val; }

  ['focus','input','change','blur'].forEach(ev =>
    el.dispatchEvent(new Event(ev, { bubbles: true, cancelable: true }))
  );
  el.dispatchEvent(new KeyboardEvent('keydown',  { bubbles: true, cancelable: true }));
  el.dispatchEvent(new KeyboardEvent('keypress', { bubbles: true, cancelable: true }));
  el.dispatchEvent(new KeyboardEvent('keyup',    { bubbles: true, cancelable: true }));

  return true;
}


const getStorage = (keys) =>
  Promise.resolve(Object.fromEntries(keys.map(k => [k, localStorage.getItem(k)])));

const setStorage = (obj) => {
  Object.entries(obj).forEach(([k,v]) => localStorage.setItem(k, v));
  return Promise.resolve();
};


function detectType(key){
  if(!key) return null;
  if(key.startsWith("eyJ") && key.split(".").length === 3) return "okvip";
  if(/^[a-f0-9]{32}$/i.test(key)) return "sv2";
  return null;
}


// =====================================================
// CAPTURE CAPTCHA IMAGE → BASE64
// =====================================================

async function captureElementToBase64(el){
  return new Promise(resolve => {
    try{
      // Nếu là thẻ img, dùng canvas để convert
      if(el.tagName === 'IMG'){
        const canvas = document.createElement('canvas');
        canvas.width  = el.naturalWidth  || el.width;
        canvas.height = el.naturalHeight || el.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(el, 0, 0);
        resolve(canvas.toDataURL('image/png').split(',')[1]);
        return;
      }

      // Nếu là canvas, lấy trực tiếp
      if(el.tagName === 'CANVAS'){
        resolve(el.toDataURL('image/png').split(',')[1]);
        return;
      }

      // Dùng html2canvas cho div/container
      if(window.html2canvas){
        window.html2canvas(el, { useCORS: true, allowTaint: true, scale: 1 }).then(canvas => {
          resolve(canvas.toDataURL('image/png').split(',')[1]);
        }).catch(() => resolve(null));
      }else{
        // Thử load html2canvas từ CDN
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        script.onload = () => {
          window.html2canvas(el, { useCORS: true, allowTaint: true, scale: 1 }).then(canvas => {
            resolve(canvas.toDataURL('image/png').split(',')[1]);
          }).catch(() => resolve(null));
        };
        script.onerror = () => resolve(null);
        document.head.appendChild(script);
      }
    }catch(e){
      resolve(null);
    }
  });
}


// Nếu ảnh captcha có src, lấy qua fetch → base64
async function fetchImageBase64(src){
  try{
    const resp = await fetch(src, { mode: 'cors' });
    const blob = await resp.blob();
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.onerror  = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  }catch(e){
    return null;
  }
}


// =====================================================
// SOLVE CAPTCHA VIA ANTICAPTCHA.TOP
// =====================================================

async function solveCaptchaImage(base64, type = 51){
  const apiKey = localStorage.getItem(CAPTCHA_KEY_STORE) || DEFAULT_CAPTCHA_API_KEY;

  const resp = await fetch(ANTICAPTCHA_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apikey: apiKey,
      img: base64,
      type: type
    })
  });

  const data = await resp.json();
  return data; // { success, message, captcha, base64img }
}


// =====================================================
// PARSE KẾT QUẢ VÀ CLICK
// =====================================================

/*
  Kết quả captcha dạng click-theo-thứ-tự có thể trả về:
  - Tọa độ: "100,200;150,300;200,400"
  - Text thứ tự: "E7C4" hoặc "E,7,C,4"
  Hàm này xử lý cả 2 dạng.
*/

async function executeCaptchaSolution(result, clickArea){
  if(!result) return false;

  const text = (result || "").trim();

  // Dạng tọa độ: "x1,y1;x2,y2;..."
  const coordPattern = /(\d+),(\d+)/g;
  const coords = [];
  let m;
  while((m = coordPattern.exec(text)) !== null){
    coords.push({ x: parseInt(m[1]), y: parseInt(m[2]) });
  }

  if(coords.length > 0){
    showToast(`🎯 Click ${coords.length} điểm...`, "info");
    const rect = (clickArea || document.body).getBoundingClientRect();

    for(let i = 0; i < coords.length; i++){
      const { x, y } = coords[i];
      const absX = rect.left + x;
      const absY = rect.top  + y;

      // Tìm element tại tọa độ
      const el = document.elementFromPoint(absX, absY) || clickArea;

      el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: absX, clientY: absY }));
      el.dispatchEvent(new MouseEvent('mouseup',   { bubbles: true, clientX: absX, clientY: absY }));
      el.dispatchEvent(new MouseEvent('click',     { bubbles: true, clientX: absX, clientY: absY }));

      await new Promise(r => setTimeout(r, 500));
    }
    return true;
  }

  // Dạng text thuần: điền vào ô input captcha nếu có
  const otpEl = findOtpInput();
  if(otpEl && text){
    fillInput(otpEl, text);
    return true;
  }

  return false;
}


// =====================================================
// HANDLER GIẢI CAPTCHA
// =====================================================

async function handleSolveCaptchaClick(){
  const btn = document.getElementById("okvip-btn-captcha");
  if(btn){
    btn.textContent = "⏳ Đang xử lý";
    btn.style.background = "#6c757d";
    btn.disabled = true;
  }

  showToast("📸 Chụp ảnh captcha...", "info");

  try{
    // 1. Lấy ảnh captcha
    let base64 = null;
    const imgEl = findCaptchaImage();

    if(imgEl && imgEl.src && !imgEl.src.startsWith('data:')){
      // Thử fetch trực tiếp src
      base64 = await fetchImageBase64(imgEl.src);
    }

    if(!base64 && imgEl){
      base64 = await captureElementToBase64(imgEl);
    }

    if(!base64){
      // Fallback: chụp toàn bộ container
      const container = findCaptchaContainer();
      if(container) base64 = await captureElementToBase64(container);
    }

    if(!base64){
      showToast("❌ Không tìm thấy ảnh captcha", "error");
      resetCaptchaBtn(btn);
      return;
    }

    showToast("🤖 Đang gửi API giải...", "info");

    // 2. Gửi lên anticaptcha.top
    // type 51 = Recaptcha Images Recognition (click theo thứ tự)
    // type 14 = Image to text autodetect (fallback)
    let result = await solveCaptchaImage(base64, 51);

    // Nếu type 51 thất bại, thử type 14
    if(!result?.success){
      result = await solveCaptchaImage(base64, 14);
    }

    if(!result?.success){
      showToast(`❌ Giải thất bại: ${result?.message || "Lỗi"}`, "error");
      resetCaptchaBtn(btn);
      return;
    }

    showToast(`✅ Kết quả: ${result.captcha}`, "success");

    // 3. Thực hiện click / điền
    const clickArea = findCaptchaClickArea() || findCaptchaImage();
    await executeCaptchaSolution(result.captcha, clickArea);

  }catch(e){
    showToast("❌ Lỗi: " + e.message, "error");
  }

  resetCaptchaBtn(btn);
}


function resetCaptchaBtn(btn){
  if(!btn) return;
  btn.textContent = "🔓 Giải Captcha";
  btn.style.background = "#8b5cf6";
  btn.disabled = false;
}


// =====================================================
// API
// =====================================================

async function callOkvip(path){
  return (await fetch(WORKER + path)).json();
}

async function callSv2(apiKey, params){
  return (await fetch(SV2_BASE + "?" + new URLSearchParams({apik: apiKey, ...params}))).json();
}


// =====================================================
// CANCEL SIM
// =====================================================

async function cancelSim(sim, apiKey){
  try{
    if(sim.source === "okvip")
      await callOkvip(`/cancel?api_key=${apiKey}&sim_id=${sim.simId}`);
    else
      await callSv2(apiKey, {act:"expired", id:sim.otpId});
  }catch(e){}
}


// =====================================================
// RENT SIM
// =====================================================

async function rentNewSim(apiKey, type){
  showToast("⏳ Đang thuê SIM...","info");

  for(let i = 0; i < 3; i++){
    try{
      if(type === "okvip"){
        const d = await callOkvip(`/get-sim?api_key=${apiKey}&service_id=${FIXED_SVC}`);
        if(d?.status !== 200) continue;
        return {
          phone: d.data.phone,
          simObj: {
            source:"okvip",
            otpId: d.data.otpId,
            simId: d.data.simId,
            phone: d.data.phone,
            code:  null,
            done:  false
          }
        };
      }else{
        const d = await callSv2(apiKey, {act:"number", appId:APP_ID});
        if(d?.ResponseCode !== 0) continue;
        const phone = "0" + d.Result.Number;
        return {
          phone,
          simObj: {
            source:"sv2",
            otpId: d.Result.Id,
            simId: d.Result.Id,
            phone,
            code: null,
            done: false
          }
        };
      }
    }catch(e){}

    await new Promise(r => setTimeout(r, 1500));
  }

  showToast("❌ Kho số tạm hết","error");
  return null;
}


// =====================================================
// POLL OTP
// =====================================================

async function pollOtp(sim, apiKey, btn){
  const maxTry = 30;
  let count = 0;

  return new Promise(resolve => {
    const timer = setInterval(async() => {
      count++;

      if(count > maxTry){
        clearInterval(timer);
        btn.textContent = "⏰ Hết giờ";
        btn.style.background = "#dc3545";
        resolve(null);
        return;
      }

      try{
        let code = null;

        if(sim.source === "okvip"){
          const d = await callOkvip(`/get-otp?api_key=${apiKey}&otp_id=${sim.otpId}`);
          const content = d?.data?.content || "";
          const m = content.match(/\b\d{4,8}\b/);
          if(m) code = m[0];
        }else{
          const d = await callSv2(apiKey, {act:"code", id:sim.otpId});
          if(d?.ResponseCode === 0 && d?.Result?.Code) code = d.Result.Code;
        }

        if(code){
          clearInterval(timer);
          btn.textContent = `✅ OTP ${code}`;
          btn.style.background = "#28a745";
          fillInput(findOtpInput(), code);
          sim.code = code;
          sim.done = true;
          setStorage({[CURRENT_SIM_KEY]: JSON.stringify(sim)});
          resolve(code);
        }

      }catch(e){}

    }, 4000);
  });
}


// =====================================================
// FILL PHONE HELPER
// =====================================================

function doFillPhone(phone){
  const phoneEl = findPhoneInput();
  setTimeout(() => {
    fillInput(phoneEl, stripZero(phone));
    setTimeout(() => {
      if(!phoneEl?.value) fillInput(phoneEl, phone);
    }, 500);
  }, 300);
}


// =====================================================
// HANDLERS
// =====================================================

async function handleFillPhoneClick(){
  const {[API_KEY_STORE]:apiKey, [CURRENT_SIM_KEY]:currentRaw}
    = await getStorage([API_KEY_STORE, CURRENT_SIM_KEY]);

  const type = detectType(apiKey);
  if(!apiKey || !type){
    showToast("❌ API key lỗi","error");
    return;
  }

  let currentSim = null;
  try{ currentSim = JSON.parse(currentRaw || "null"); }catch(e){}

  const phoneEl      = findPhoneInput();
  const placeholder  = phoneEl?.placeholder || "";
  const isVerifyStep = /\d+\*\d+/.test(placeholder);

  if(isVerifyStep){
    if(currentSim?.phone){
      showToast(`♻️ Dùng lại ${currentSim.phone}`, "info");
      doFillPhone(currentSim.phone);
    }else{
      showToast("❌ Chưa có SIM","error");
    }
    return;
  }

  if(phoneEl?.value) fillInput(phoneEl, "");
  if(currentSim) await cancelSim(currentSim, apiKey);

  const res = await rentNewSim(apiKey, type);
  if(!res) return;

  setStorage({[CURRENT_SIM_KEY]: JSON.stringify(res.simObj)});
  showToast(`✅ ${res.phone}`, "success");
  doFillPhone(res.phone);
}


async function handleOtpClick(){
  const {[CURRENT_SIM_KEY]:raw, [API_KEY_STORE]:apiKey}
    = await getStorage([CURRENT_SIM_KEY, API_KEY_STORE]);

  let sim = null;
  try{ sim = JSON.parse(raw || "null"); }catch(e){}

  if(!sim){
    showToast("❌ Chưa có SIM","error");
    return;
  }

  const btn = document.getElementById("okvip-btn-otp");
  btn.textContent = "⏳ Đang chờ";
  btn.style.background = "#6c757d";

  await pollOtp(sim, apiKey, btn);
}


// =====================================================
// BUTTON INJECT
// =====================================================

function injectBtn(inputEl, id, label, color, handler){
  if(document.getElementById(id)) return;

  const parent = inputEl.parentElement;
  if(getComputedStyle(parent).position === "static")
    parent.style.position = "relative";

  const btn = document.createElement("button");
  btn.id          = id;
  btn.type        = "button";
  btn.textContent = label;
  btn.style.cssText = `
    position:absolute;
    right:8px;
    top:50%;
    transform:translateY(-50%);
    z-index:9999;
    padding:4px 10px;
    background:${color};
    color:#fff;
    border:none;
    border-radius:6px;
    font-size:12px;
    font-weight:bold;
    cursor:pointer;
  `;
  btn.onclick = handler;
  parent.appendChild(btn);
}


// Inject nút giải captcha (nút nổi, không gắn vào input)
function injectCaptchaBtn(){
  if(document.getElementById("okvip-btn-captcha")) return;

  const container = findCaptchaContainer();
  if(!container) return;

  // Đảm bảo container có position
  if(getComputedStyle(container).position === "static")
    container.style.position = "relative";

  const btn = document.createElement("button");
  btn.id          = "okvip-btn-captcha";
  btn.type        = "button";
  btn.textContent = "🔓 Giải Captcha";
  btn.style.cssText = `
    position:absolute;
    top:6px;
    right:6px;
    z-index:99999;
    padding:5px 12px;
    background:#8b5cf6;
    color:#fff;
    border:none;
    border-radius:6px;
    font-size:12px;
    font-weight:bold;
    cursor:pointer;
    box-shadow:0 2px 8px rgba(0,0,0,0.3);
  `;
  btn.onclick = handleSolveCaptchaClick;
  container.appendChild(btn);
}


// =====================================================
// TOAST
// =====================================================

function showToast(msg, type){
  document.getElementById("okvip-toast")?.remove();

  const colors = { success:"#28a745", error:"#dc3545", info:"#007bff" };

  const t = document.createElement("div");
  t.id = "okvip-toast";
  t.textContent = msg;
  t.style.cssText = `
    position:fixed;
    bottom:24px;
    left:50%;
    transform:translateX(-50%);
    z-index:99999;
    padding:10px 20px;
    border-radius:8px;
    font-size:13px;
    font-weight:bold;
    color:#fff;
    background:${colors[type]||"#333"};
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
    injectBtn(phone, "okvip-btn-phone", "📲 Điền SĐT", "#ff6b00", handleFillPhoneClick);

    const placeholder  = phone.placeholder || "";
    const isVerifyStep = /\d+\*\d+/.test(placeholder);

    if(!phone.value && isVerifyStep){
      try{
        const sim = JSON.parse(localStorage.getItem(CURRENT_SIM_KEY) || "null");
        if(sim?.phone){
          setTimeout(() => {
            if(!phone.value){
              fillInput(phone, stripZero(sim.phone));
              setTimeout(() => {
                if(!phone.value) fillInput(phone, sim.phone);
              }, 500);
            }
          }, 400);
        }
      }catch(e){}
    }
  }

  const otp = findOtpInput();
  if(otp) injectBtn(otp, "okvip-btn-otp", "📨 Lấy OTP", "#28a745", handleOtpClick);

  // Inject nút giải captcha khi phát hiện captcha container
  injectCaptchaBtn();
}

tryInject();

new MutationObserver(tryInject).observe(document.body, {
  childList: true,
  subtree:   true
});
