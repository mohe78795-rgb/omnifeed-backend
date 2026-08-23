// ==========================================================================
// ⚙️ 1. الثوابت والإعدادات العامة للمنظومة
// ==========================================================================
const API = window.location.origin;
const API_GET_PACKAGES = `${API}/api/packages`;
const API_EXECUTE_TOPUP = `${API}/api/mdarahim/packages`;

const WHATSAPP_NUMBER = "967737528057";
const USD_TO_YER_RATE = 535;
const COMMISSION_PERCENT = 0.07;

const NETWORKS = {
    YM: { name: "يمن موبايل", logo: "https://i.postimg.cc/BZrr0yD7/images-2026-07-06T163911-011.jpg" },
    YOU: { name: "يُو (YOU)", logo: "https://i.postimg.cc/T2zz6Sms/images-(19).png" },
    SABA: { name: "سبأفون", logo: "https://i.postimg.cc/44DDgMtS/tnzyl-(2).jpg" },
    WYE: { name: "وَي (WYE)", logo: "https://i.postimg.cc/9fgkNNCF/ev4KBYC3-400x400.png" },
    TELE: { name: "الهاتف الثابت", logo: "https://i.postimg.cc/GpgfSSdm/images-(18).png" }
};

let dbPackages = [];
let selectedPackage = null;
let currentNetKey = null;
let activePackageTag = 'ALL';
let currentUnitPrice = 0;

let state = {
    categories: [],
    prods: [],
    cart: [],
    activeCategory: null,
    productLayoutMode: 0,
    user: JSON.parse(localStorage.getItem('abu_user_v30')) || null,
    games: [],
    structuredGames: {},
    filteredGames: {},
    selectedGame: null,
    searchQuery: "",
    viewHistory: ["home"]
};

// ==========================================================================
// 🔊 نظام التفاعل الصوتي والاهتزاز للمسات الأزرار الملكية
// ==========================================================================
document.addEventListener('click', function(e) {
    const btn = e.target.closest('button, .quick-nav-btn, .nav-item, a, [onclick]');
    if (btn) {
        try {
            const snd = document.getElementById('snd-click');
            if (snd) { 
                snd.currentTime = 0; 
                snd.play().catch(() => {}); 
            }
        } catch(err){}

        if (navigator.vibrate) {
            try { navigator.vibrate(35); } catch(err){}
        }
    }
});

// ==========================================================================
// 📱 2. إدارة التنقل وتاريخ المتصفح والتشغيل الآمن
// ==========================================================================
window.addEventListener('popstate', function () {
    if (state.viewHistory.length > 1) {
        state.viewHistory.pop();
        const prevView = state.viewHistory[state.viewHistory.length - 1];
        changeViewSilent(prevView);
    } else {
        handleDoubleTapExit();
    }
});

let lastBackPressTime = 0;
function handleDoubleTapExit() {
    const currentTime = new Date().getTime();
    if (currentTime - lastBackPressTime < 2000) {
        toast("👋 جاري الخروج من التطبيق...");
        if (window.AndroidBridge && window.AndroidBridge.closeApp) {
            window.AndroidBridge.closeApp();
        }
    } else {
        toast("اضغط رجوع مرة أخرى للخروج");
        lastBackPressTime = currentTime;
        try { history.pushState({ page: "backGuard" }, ""); } catch(e){}
    }
}

window.onload = () => {
    try { history.pushState({ page: "backGuard" }, ""); } catch(e){}
    
    setTimeout(() => {
        const splash = document.getElementById('splash');
        if (state.user) {
            unlockApp();
        } else {
            if (splash) splash.classList.add('hidden');
            const authScreen = document.getElementById('auth-screen');
            if (authScreen) {
                authScreen.classList.remove('hidden');
                authScreen.style.display = 'flex';
            }
        }
    }, 1000);
};

document.addEventListener('DOMContentLoaded', () => {
    fetchPackagesFromDB();
    setupPhoneInputListener();
    setupScrollRefreshListener();
});

// ==========================================================================
// 🔄 تحديث الرصيد والبيانات الحية من السيرفر
// ==========================================================================
async function fetchUserData() {
    if (!state.user || !state.user.phone) return;
    try {
        const res = await fetch(`${API}/api/user/${state.user.phone}`, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
            const data = await res.json();
            if (data && data.user) {
                state.user = { ...state.user, ...data.user };
            } else if (data && data.bal !== undefined) {
                state.user.bal = data.bal;
            } else if (data && data.success && data.balance !== undefined) {
                state.user.bal = data.balance;
            }
            localStorage.setItem('abu_user_v30', JSON.stringify(state.user));
            ui(); // تحديث واجهة الرصيد فوراً
        }
    } catch (e) {
        console.error("خطأ في جلب بيانات الرصيد من السيرفر:", e);
    }
}

// ==========================================================================
// 🔔 3. نظام إشعارات الـ FCM ومزامنة الجلسة
// ==========================================================================
window.handleFcmToken = function(token) {
    localStorage.setItem("fcm_token", token);
    if (state.user && state.user.phone) {
        syncTokenWithServer(token, state.user.phone);
    }
};

async function syncTokenWithServer(token, phone) {
    try {
        await fetch(`${API}/api/register-token`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: token, user_id: phone })
        });
    } catch (err) {
        console.error("❌ فشل إرسال الـ FCM Token للسيرفر:", err);
    }
}

async function unlockApp() {
    const splash = document.getElementById('splash');
    const authScreen = document.getElementById('auth-screen');
    const appLayout = document.getElementById('app-layout');

    if (splash) splash.classList.add('hidden');
    
    if (authScreen) {
        authScreen.classList.add('hidden');
        authScreen.style.display = 'none';
    }

    if (appLayout) {
        appLayout.classList.remove('hidden');
        appLayout.style.display = 'flex';
    }

    changeViewSilent('home');
    ui();

    // جلب الرصيد والبيانات المحدثة فوراً من السيرفر عند فتح التطبيق
    await fetchUserData();

    Promise.allSettled([
        initProducts(),
        fetchAds(),
        fetchGames(),
        fetchMessages()
    ]).catch(err => console.log("Background sync error:", err));

    const cachedToken = localStorage.getItem("fcm_token");
    if (cachedToken && state.user && state.user.phone) {
        syncTokenWithServer(cachedToken, state.user.phone);
    }
}

function convertUsdToYer(usd) {
    let r = parseFloat(usd);
    return isNaN(r) ? 0 : Math.ceil((r * USD_TO_YER_RATE) * (1 + COMMISSION_PERCENT));
}

// ==========================================================================
// 🔄 سحب الشاشة للأسفل للتحديث (Pull to Refresh)
// ==========================================================================
function setupScrollRefreshListener() {
    let touchstartY = 0;
    const homeView = document.getElementById('view-home');
    if (!homeView) return;

    window.addEventListener('touchstart', e => {
        touchstartY = e.changedTouches[0].screenY;
    }, {passive: true});

    window.addEventListener('touchend', e => {
        let touchendY = e.changedTouches[0].screenY;
        if (touchendY - touchstartY > 120 && window.scrollY === 0) {
            if (!homeView.classList.contains('hidden')) {
                manualRefresh();
            }
        }
    }, {passive: true});
}

// ==========================================================================
// 🔐 4. إدارة الجلسات والمصادقة
// ==========================================================================
function toggleAuthMode() {
    const container = document.getElementById('signup-name-container');
    const title = document.getElementById('auth-title');
    const btn = document.getElementById('auth-btn');
    const toggleText = document.getElementById('auth-toggle-text');
    const toggleBtn = document.getElementById('auth-toggle-btn');

    if (!container) return;

    container.classList.toggle('hidden');
    const isSignup = !container.classList.contains('hidden');

    if (isSignup) {
        title.innerText = "إنشاء حساب جديد";
        btn.innerText = "تسجيل وحفظ الحساب 🚀";
        toggleText.innerText = "لديك حساب بالفعل؟";
        toggleBtn.innerText = "تسجيل الدخول";
    } else {
        title.innerText = "تسجيل الدخول";
        btn.innerText = "دخول النظام";
        toggleText.innerText = "ليس لديك حساب؟";
        toggleBtn.innerText = "إنشاء حساب جديد";
    }
}

async function handleAuth() {
    const container = document.getElementById('signup-name-container');
    const isSignup = container && !container.classList.contains('hidden');
    
    const nameInput = document.getElementById('auth-name');
    const phoneInput = document.getElementById('auth-phone');
    const passInput = document.getElementById('auth-pass');

    const name = nameInput ? nameInput.value.trim() : "";
    const phone = phoneInput ? phoneInput.value.trim() : "";
    const pass = passInput ? passInput.value.trim() : "";

    if (!phone || !pass || (isSignup && !name)) {
        toast("⚠️ يرجى ملء كافة الحقول المطلوبة بشكل صحيح");
        return;
    }

    if (phone.length < 9) {
        toast("⚠️ رقم الهاتف يجب ألا يقل عن 9 أرقام");
        return;
    }

    const url = isSignup ? `${API}/api/auth/signup` : `${API}/api/auth/login`;
    toast("⏳ جاري الاتصال بالخادم...");

    const authBtn = document.getElementById('auth-btn');
    if (authBtn) authBtn.disabled = true;

    try {
        const payload = isSignup ? { name, phone, pass } : { phone, pass };
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok && data.success) {
            state.user = data.user || { name: name || "عميل", phone: phone, bal: 0 };
            
            localStorage.setItem('abu_user_v30', JSON.stringify(state.user));
            localStorage.setItem('user_phone', phone);
            
            const extractedToken = data.token || (data.user && data.user.token);
            if (extractedToken) {
                localStorage.setItem('user_token', extractedToken);
                state.user.token = extractedToken;
            }

            const cachedToken = localStorage.getItem("fcm_token");
            if (cachedToken) {
                syncTokenWithServer(cachedToken, phone);
            }
            
            try { document.getElementById('snd-cashier')?.play().catch(()=>{}); } catch(e){}
            toast(isSignup ? "✅ تم إنشاء الحساب وحفظه بنجاح!" : "✅ أهلاً بك، تم تسجيل الدخول بنجاح");
            
            unlockApp();
        } else {
            toast("❌ " + (data.message || "حدث خطأ في عملية المصادقة"));
        }
    } catch (e) {
        console.error("Auth error:", e);
        toast("❌ خطأ في الاتصال بالخادم، تأكد من الإنترنت");
    } finally {
        if (authBtn) authBtn.disabled = false;
    }
}

function logout() {
    try {
        const snd = document.getElementById('snd-click');
        if (snd) { snd.currentTime = 0; snd.play().catch(()=>{}); }
    } catch(e){}

    localStorage.removeItem('abu_user_v30');
    localStorage.removeItem('user_phone');
    localStorage.removeItem('user_token');
    localStorage.removeItem('fcm_token');
    
    state.user = null;
    state.cart = [];
    state.viewHistory = ["home"];
    
    toast("👋 تم تسجيل الخروج بنجاح");

    const appLayout = document.getElementById('app-layout');
    const authScreen = document.getElementById('auth-screen');
    const splash = document.getElementById('splash');

    if (splash) splash.classList.add('hidden');

    if (appLayout) {
        appLayout.classList.add('hidden');
        appLayout.style.display = 'none';
    }
    
    if (authScreen) {
        authScreen.classList.remove('hidden');
        authScreen.style.display = 'flex';
    }

    changeViewSilent('home');

    const phoneInput = document.getElementById('auth-phone');
    const passInput = document.getElementById('auth-pass');
    const nameInput = document.getElementById('auth-name');
    if (phoneInput) phoneInput.value = '';
    if (passInput) passInput.value = '';
    if (nameInput) nameInput.value = '';

    const accName = document.getElementById('acc-name');
    const accPhone = document.getElementById('acc-phone');
    const accAvatar = document.getElementById('acc-avatar-large');
    const uBalTop = document.getElementById('u-balance-top');

    if (accName) accName.innerText = 'تسجيل الدخول';
    if (accPhone) accPhone.innerText = '---';
    if (accAvatar) accAvatar.innerText = '؟';
    if (uBalTop) uBalTop.innerText = '0 YER';
}

// ==========================================
// 🎬 5. نظام الفيديو الإعلاني
// ==========================================
async function fetchAds() {
    try {
        let res = await fetch(`${API}/api/ads`, { signal: AbortSignal.timeout(3000) });
        let ads = await res.json();
        const container = document.getElementById('ad-video-container');
        const player = document.getElementById('ad-video-player');
        
        if (ads && ads.length > 0 && ads[0].videoUrl) {
            if (player) {
                player.src = ads[0].videoUrl;
                player.muted = true;
                player.loop = true;
                player.play().catch(err => {});
            }
            if (container) container.classList.remove('hidden');
        } else {
            if (container) container.classList.add('hidden');
        }
    } catch (e) {}
}

function toggleAdMute() {
    const player = document.getElementById('ad-video-player');
    const icon = document.getElementById('ad-mute-icon');
    if (!player) return;

    player.muted = !player.muted;
    if (icon) {
        icon.className = player.muted ? "fa-solid fa-volume-xmark text-xs text-[#c5a862]" : "fa-solid fa-volume-high text-xs text-[#c5a862]";
    }
    toast(player.muted ? "🔇 تم كتم الصوت" : "🔊 تم تفعيل الصوت");
}

// ==========================================
// 🔔 6. نظام الإشعارات (الجرس)
// ==========================================
async function fetchMessages() {
    if (!state.user) return;
    try {
        const res = await fetch(`${API}/api/messages/${state.user.phone}`, { signal: AbortSignal.timeout(3000) });
        const data = await res.json();
        const list = document.getElementById('notifications-list');
        const headerDot = document.getElementById('header-notif-dot');

        if (data && data.length > 0) {
            if (headerDot) headerDot.classList.remove('hidden');
            if (list) {
                list.innerHTML = data.map(m => `
                    <div class="p-4 bg-[#0d0f11] border border-[#1d2127] rounded-2xl flex items-start gap-3 shadow-md">
                        <div class="w-8 h-8 rounded-lg bg-[#c5a862]/10 border border-[#c5a862]/30 flex items-center justify-center text-[#c5a862] shrink-0 mt-0.5">
                            <i class="fas fa-bullhorn text-xs"></i>
                        </div>
                        <div class="space-y-1 flex-1 text-right">
                            <div class="flex justify-between items-center">
                                <h4 class="text-xs font-black text-white">${m.title || 'إشعار جديد'}</h4>
                                <span class="text-[9px] text-gray-500 font-mono" dir="ltr">${m.date || ''}</span>
                            </div>
                            <p class="text-[11px] text-gray-300 leading-relaxed whitespace-pre-line">${m.body || m.text}</p>
                        </div>
                    </div>
                `).join('');
            }
        }
    } catch (e) {}
}

// ==========================================
// 💬 7. نظام الرسائل والدردشة الدعم الفني
// ==========================================
function sendSupportMsg() {
    const input = document.getElementById('support-input-text');
    const msgBox = document.getElementById('whatsapp-chat-box');
    if (!input || !input.value.trim()) return;

    const text = input.value.trim();
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const userMsgHTML = `
        <div class="flex items-start justify-end gap-2 max-w-[85%] mr-auto animate-fadeIn">
            <div class="bg-[#c5a862] text-black p-3 rounded-2xl rounded-tl-none text-xs space-y-1 shadow-md">
                <p class="font-bold leading-relaxed">${text}</p>
                <span class="block text-[8px] text-black/60 text-left font-mono font-bold" dir="ltr">${time}</span>
            </div>
        </div>
    `;
    msgBox.insertAdjacentHTML('beforeend', userMsgHTML);
    input.value = '';
    msgBox.scrollTop = msgBox.scrollHeight;

    document.getElementById('msg-dot')?.classList.remove('hidden');

    setTimeout(() => {
        try { document.getElementById('snd-notification')?.play().catch(()=>{}); } catch(e){}
        const adminReplyHTML = `
            <div class="flex items-start gap-2 max-w-[85%] animate-fadeIn">
                <div class="bg-[#121418] border border-[#1d2127] p-3 rounded-2xl rounded-tr-none text-xs text-white space-y-1 shadow-md">
                    <span class="block text-[9px] text-[#c5a862] font-bold">إدارة تموينات أبو حسين</span>
                    <p class="leading-relaxed">أهلاً بك! تم استلام رسالتك وسيتم الرد عليك قريباً.</p>
                    <span class="block text-[8px] text-gray-500 text-left font-mono" dir="ltr">${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            </div>
        `;
        msgBox.insertAdjacentHTML('beforeend', adminReplyHTML);
        msgBox.scrollTop = msgBox.scrollHeight;
    }, 1000);
}

// ==========================================
// 🛒 8. سلة التسوق وإرسال الطلب مع الموقع الدقيق
// ==========================================
function addToCart(p, eventElement = null) {
    const pId = p._id?.$oid || p._id;
    let item = state.cart.find(x => (x._id?.$oid || x._id) === String(pId));
    if (item) item.qty++;
    else state.cart.push({ ...p, qty: 1 });
    
    ui();
    toast("🛒 أضيف المنتج إلى السلة بنجاح");

    try {
        const dropSound = document.getElementById('snd-drop');
        if (dropSound) { dropSound.currentTime = 0; dropSound.play().catch(()=>{}); }
    } catch(e){}

    createFlyingAnimation(p.img || "https://megatec-center.com/img/raw/11_img.jpeg", eventElement);
}

function createFlyingAnimation(imgSrc, targetElement) {
    let startX = window.innerWidth / 2;
    let startY = window.innerHeight / 2;

    if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        startX = rect.left + rect.width / 2;
        startY = rect.top + rect.height / 2;
    }

    const flyer = document.createElement('img');
    flyer.src = imgSrc;
    flyer.className = 'flying-item';
    flyer.style.left = `${startX - 25}px`;
    flyer.style.top = `${startY - 25}px`;
    document.body.appendChild(flyer);

    setTimeout(() => {
        flyer.remove();
        const cartNavIcon = document.querySelector("button[onclick*='cart']");
        if (cartNavIcon) {
            cartNavIcon.classList.add('scale-125', 'transition-transform');
            setTimeout(() => cartNavIcon.classList.remove('scale-125'), 300);
        }
    }, 800);
}

function updateQty(id, delta) {
    let item = state.cart.find(x => (x._id?.$oid || x._id) === String(id));
    if (item) {
        item.qty += delta;
        if (item.qty <= 0) state.cart = state.cart.filter(x => (x._id?.$oid || x._id) !== String(id));
        ui();
    }
}

function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) { 
            toast("⚠️ الموقع الجغرافي غير مدعوم في جهازك"); 
            reject(new Error("Geolocation not supported")); 
            return; 
        }
        
        toast("📍 جاري تحديد الإحداثيات عبر الـ GPS...");
        
        navigator.geolocation.getCurrentPosition(
            (p) => {
                const lat = p.coords.latitude;
                const lng = p.coords.longitude;
                const mapLink = `https://www.google.com/maps?q=${lat},${lng}`;
                resolve({ link: mapLink, lat, lng });
            },
            (e) => {
                alert("❌ تعذر تحديد موقعك بدقة. يرجى تفعيل الـ GPS بهاتفك وإعادة المحاولة.");
                reject(e);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    });
}

async function processOrder(method) {
    if (state.cart.length === 0) return toast("🛒 حقيبة التسوق فارغة حالياً");
    const total = state.cart.reduce((s, i) => s + (Number(i.price) * Number(i.qty)), 0);
    
    if (method === 'wallet' && Number(state.user.bal) < total) {
        return toast("❌ رصيد محفظتك غير كافٍ لإتمام الفاتورة");
    }

    if (method === 'whatsapp') {
        let msg = `*🛍️ طلب جديد من متجر أبو حسين*\n*العميل:* ${state.user.name} (${state.user.phone})\n*الإجمالي:* ${total} YER\n\n*المنتجات المطلوبة:*\n`;
        state.cart.forEach(i => { msg += `• ${i.name} (x${i.qty}) - ${i.price * i.qty} YER\n`; });
        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
        state.cart = [];
        ui();
        return;
    }

    try {
        const location = await getUserLocation();
        submitOrderToDB(location, total, method === 'wallet' ? "دفع عبر المحفظة" : "الدفع عند الاستلام (مع خريطة الموقع)");
    } catch(e) {}
}

async function submitOrderToDB(loc, total, paymentType) {
    toast("⏳ جاري إرسال الطلب للسيرفر...");
    try {
        let res = await fetch(`${API}/api/orders/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phone: state.user.phone,
                order: { 
                    total, 
                    items: state.cart, 
                    location: loc.link || loc, 
                    paymentMethod: paymentType 
                }
            })
        });
        if (res.ok) {
            let data = await res.json();
            try { document.getElementById('snd-cashier')?.play().catch(()=>{}); } catch(e){}
            toast("✅ تم تسجيل الطلب وحفظ موقع التوصيل بنجاح!");
            state.cart = [];
            if (data.currentBal !== undefined) {
                state.user.bal = data.currentBal;
            } else {
                await fetchUserData(); // مزامنة فورية للرصيد
            }
            localStorage.setItem('abu_user_v30', JSON.stringify(state.user));
            ui();
            changeView('orders', null);
        }
    } catch (e) {
        toast("❌ حدث عطل في اتصال الشبكة بالخادم");
    }
}

async function loadOrders() {
    const list = document.getElementById('orders-list');
    if (!list) return;
    if (!state.user) { list.innerHTML = `<div class="text-center py-12 text-xs text-slate-500">سجل الدخول لعرض الفواتير</div>`; return; }

    list.innerHTML = `<div class="text-center py-12 text-xs text-slate-500">جاري جلب الفواتير... ⏳</div>`;
    try {
        let res = await fetch(`${API}/api/orders/${state.user.phone}`, { signal: AbortSignal.timeout(4000) });
        let orders = await res.json();
        if (orders && orders.length > 0) {
            list.innerHTML = orders.map(o => `
                <div class="p-5 bg-[#121418] rounded-3xl border border-[#1d2127] space-y-3 shadow-lg">
                    <div class="flex justify-between items-center">
                        <span class="text-xs font-black text-[#c5a862] font-mono">${o.id || 'فاتورة رقمية'}</span>
                        <span class="text-[10px] px-3 py-1 bg-[#0d0f11] rounded-lg border text-amber-400 font-bold">${o.status}</span>
                    </div>
                    <div class="text-xs text-slate-300 space-y-1">
                        ${Array.isArray(o.items) ? o.items.map(i => `• ${i.name} (x${i.qty || 1})`).join('<br>') : ''}
                        ${o.location ? `<div class="pt-2"><a href="${o.location}" target="_blank" class="text-xs text-[#c5a862] underline font-bold flex items-center gap-1"><i class="fa-solid fa-map-location-dot"></i> عرض موقع التوصيل على الخريطة</a></div>` : ''}
                    </div>
                    <div class="flex justify-between items-center border-t border-[#1d2127] pt-2">
                        <span class="text-[9px] text-slate-500 font-mono">${o.date || ''}</span>
                        <span class="text-sm font-black text-emerald-400 font-mono">${Number(o.total || 0).toLocaleString()} YER</span>
                    </div>
                </div>
            `).join('');
        } else {
            list.innerHTML = `<div class="text-center py-12 text-xs text-slate-500">لا توجد طلبات سابقة مسجلة</div>`;
        }
    } catch (e) {
        list.innerHTML = `<div class="text-center py-12 text-xs text-red-400">⚠️ خطأ في جلب الفواتير</div>`;
    }
}

// ==========================================
// 🧾 9. الأقسام والمنتجات (الكاش والمزامنة الحية)
// ==========================================
async function initProducts() {
    const cachedCat = localStorage.getItem('abu_cache_categories');
    const cachedProd = localStorage.getItem('abu_cache_products');

    if (cachedCat) {
        try { state.categories = JSON.parse(cachedCat); renderCategories(); } catch(e){}
    }
    if (cachedProd) {
        try { state.prods = JSON.parse(cachedProd); } catch(e){}
    }

    try {
        let rCat = await fetch(`${API}/api/categories`, { signal: AbortSignal.timeout(4000) });
        if (rCat.ok) {
            state.categories = await rCat.json();
            localStorage.setItem('abu_cache_categories', JSON.stringify(state.categories));
            renderCategories();
        }

        let rProd = await fetch(`${API}/api/products`, { signal: AbortSignal.timeout(4000) });
        if (rProd.ok) {
            state.prods = await rProd.json();
            localStorage.setItem('abu_cache_products', JSON.stringify(state.prods));
        }
    } catch (e) {
        console.log("التطبيق يعمل أوفلاين حالياً للأقسام والمنتجات");
    }
}

function renderCategories(customList = null) {
    const list = document.getElementById('categories-list');
    if(!list) return;
    const targetCats = customList || state.categories;

    if (targetCats.length === 0) {
        list.innerHTML = `<div class="col-span-full text-center py-6 text-xs text-slate-500">لا توجد أقسام مطابقة</div>`;
        return;
    }

    list.innerHTML = targetCats.map(c => `
        <div onclick="openCategory('${c.name}')" class="cursor-pointer p-2 bg-[#121418] rounded-2xl border border-[#1d2127] flex flex-col items-center text-center">
            <img src="${c.img || ''}" onerror="this.src='https://megatec-center.com/img/raw/11_img.jpeg'" class="w-full aspect-square object-cover rounded-xl mb-1">
            <h3 class="font-bold text-[10px] text-white truncate w-full">${c.name}</h3>
        </div>
    `).join('');
}

function searchLocalAndApi(query) {
    const txt = query.trim().toLowerCase();
    if (!txt) {
        renderCategories();
    } else {
        const filteredCats = state.categories.filter(c => c.name?.toLowerCase().includes(txt));
        renderCategories(filteredCats);
    }
}

function openCategory(catName) {
    state.activeCategory = catName;
    document.getElementById('cat-title-display').innerText = catName;
    const currentCatProds = state.prods.filter(p => p.cat?.trim().toLowerCase() === catName.trim().toLowerCase());
    renderCurrentCategoryProducts(currentCatProds);
    changeView('products', null);
}

function renderCurrentCategoryProducts(productsArray) {
    const list = document.getElementById('products-list');
    if (!list) return;

    if (productsArray.length === 0) {
        list.innerHTML = `<div class="col-span-full text-center py-12 text-xs text-slate-500">لا توجد منتجات داخل هذا القسم حالياً</div>`;
        return;
    }

    list.innerHTML = productsArray.map(p => {
        return `
            <div onclick="addToCart(${JSON.stringify(p).replace(/"/g, '&quot;')}, event.currentTarget)" class="p-3 bg-[#121418] rounded-2xl border border-[#1d2127] flex flex-col cursor-pointer active:scale-[0.98] transition hover:border-[#c5a862]/40 relative group">
                <img src="${p.img || ''}" onerror="this.src='https://megatec-center.com/img/raw/11_img.jpeg'" class="w-full aspect-square object-cover rounded-xl mb-2 bg-zinc-900">
                <h3 class="font-bold text-xs text-white truncate w-full mb-1">${p.name}</h3>
                <div class="flex items-center justify-between mt-auto pt-1">
                    <span class="text-[10px] text-[#c5a862] font-bold font-mono">${Number(p.price).toLocaleString()} YER</span>
                    <span class="text-[9px] bg-[#c5a862]/10 text-[#c5a862] font-bold px-2 py-1 rounded-lg">إضافة +</span>
                </div>
            </div>
        `;
    }).join('');
}

function filterCurrentCategoryProducts(query) {
    const txt = query.trim().toLowerCase();
    const filtered = state.prods.filter(p => {
        const matchesCat = p.cat?.trim().toLowerCase() === state.activeCategory?.trim().toLowerCase();
        const matchesName = p.name?.toLowerCase().includes(txt);
        return matchesCat && matchesName;
    });
    renderCurrentCategoryProducts(filtered);
}

// ==========================================
// 🕹️ 10. ميجا سنتر للألعاب والشحن الفوري
// ==========================================
async function fetchGames() {
    const list = document.getElementById('mega-services-list');
    if(!list) return;

    const cachedGames = localStorage.getItem('abu_cache_games');
    if (cachedGames) {
        try {
            state.games = JSON.parse(cachedGames);
            processGamesData(state.games);
        } catch(e){}
    }

    try {
        let res = await fetch(`${API}/api/games`, { signal: AbortSignal.timeout(4000) });
        let data = await res.json();
        if(data.success && data.game_list) {
            state.games = data.game_list;
            localStorage.setItem('abu_cache_games', JSON.stringify(state.games));
            processGamesData(state.games);
        }
    } catch(e) {}
}

function processGamesData(gamesList) {
    state.structuredGames = {}; 
    gamesList.forEach(item => {
        let groupName = item.ServiceGroup_AR_Name || item.ServiceGroupName || "خدمات الشحن الفوري";
        if (groupName.toLowerCase().includes('mega') || item.Provider === 'mega') {
            groupName = "ميجا سنتر للشحن الفوري ⚡";
        }

        if (!state.structuredGames[groupName]) {
            state.structuredGames[groupName] = { name: groupName, icon: item.ServiceIcon || '', packages: [] };
        }
        item.PriceInYer = convertUsdToYer(item.Price);
        state.structuredGames[groupName].packages.push(item);
    });
    renderGameCategories();
}

function renderGameCategories(customList = null) {
    const list = document.getElementById('mega-services-list');
    if(!list) return;
    const keys = customList || Object.keys(state.structuredGames);
    
    if (keys.length === 0) {
        list.innerHTML = `<div class="col-span-full text-center py-10 text-xs text-slate-500">لا توجد خدمات مطابقة للبحث</div>`;
        return;
    }

    list.innerHTML = keys.map(key => {
        const game = state.structuredGames[key];
        return `
            <div onclick="renderGamePackages('${key}')" class="p-3 bg-[#121418] rounded-2xl border border-[#1d2127] flex flex-col items-center text-center cursor-pointer active:scale-[0.98] transition hover:border-[#c5a862]/40">
                <img src="${game.icon || ''}" onerror="this.src='https://megatec-center.com/img/raw/11_img.jpeg'" class="w-14 h-14 rounded-xl object-cover bg-zinc-900 mb-2">
                <h3 class="font-black text-xs text-white truncate w-full mb-1">${game.name}</h3>
                <span class="text-[9px] text-[#c5a862] font-bold mt-auto">شحن فوري ⚡</span>
            </div>`;
    }).join('');
}

function filterGamesList(query) {
    const txt = query.trim().toLowerCase();
    if (!txt) {
        renderGameCategories();
    } else {
        const matchedKeys = Object.keys(state.structuredGames).filter(k => k.toLowerCase().includes(txt));
        renderGameCategories(matchedKeys);
    }
}

function renderGamePackages(gameKey) {
    const list = document.getElementById('mega-services-list');
    const game = state.structuredGames[gameKey];
    if(!list || !game) return;

    list.innerHTML = `
        <div class="col-span-full flex justify-between items-center mb-2">
            <h3 class="text-xs font-bold text-slate-400">اختر الحزمة لـ ${game.name}:</h3>
            <button onclick="renderGameCategories()" class="text-xs font-bold text-[#c5a862] bg-[#c5a862]/10 px-3 py-1.5 rounded-xl border border-[#c5a862]/20">رجوع</button>
        </div>
        <div class="col-span-full grid grid-cols-2 gap-3">
            ${game.packages.map(g => `
                <div onclick="openMegaModal('${gameKey}', '${g.ServiceApiID}')" class="p-3 bg-[#121418] rounded-2xl border border-[#1d2127] flex flex-col items-center text-center cursor-pointer hover:border-[#c5a862]/50">
                    <img src="${g.ServiceIcon || game.icon}" onerror="this.src='https://megatec-center.com/img/raw/11_img.jpeg'" class="w-12 h-12 rounded-xl object-cover mb-2">
                    <h3 class="font-bold text-xs text-white truncate w-full mb-1">${g.ServiceName_AR || g.ServiceName}</h3>
                    <p class="text-[10px] text-emerald-400 font-bold font-mono mt-auto">${g.PriceInYer.toLocaleString()} YER</p>
                </div>
            `).join('')}
        </div>`;
}

function openMegaModal(gameKey, serviceId) {
    const game = state.structuredGames[gameKey];
    if (!game) return;
    const service = game.packages.find(x => String(x.ServiceApiID) === String(serviceId));
    if (!service) return;

    state.selectedGame = service;
    currentUnitPrice = service.PriceInYer || 0;

    let requirementText = "رقم اللاعب / الحساب (ID)";
    let fieldName = "user_id";

    if (service.Requires && Array.isArray(service.Requires) && service.Requires.length > 0) {
        const reqData = service.Requires[0];
        if (reqData.ar_name) requirementText = reqData.ar_name;
        if (reqData.fieldname) fieldName = reqData.fieldname;
    }

    document.getElementById('modal-package-name').innerText = service.ServiceName_AR || service.ServiceName;
    document.getElementById('modal-package-price').innerText = `${currentUnitPrice.toLocaleString()} YER`;
    
    const inputEl = document.getElementById('mega-target-id');
    if (inputEl) {
        inputEl.placeholder = `أدخل ${requirementText}...`;
        inputEl.setAttribute('data-fieldname', fieldName);
        inputEl.value = "";
    }

    const sheet = document.getElementById('mega-bottom-sheet');
    const overlay = document.getElementById('mega-modal-overlay');
    if (sheet) { sheet.classList.remove('hidden'); setTimeout(() => sheet.style.bottom = "0", 10); }
    if (overlay) { overlay.classList.remove('hidden'); setTimeout(() => overlay.classList.add('opacity-100'), 10); }
}

function closeMegaModal() {
    const sheet = document.getElementById('mega-bottom-sheet');
    const overlay = document.getElementById('mega-modal-overlay');
    if (!sheet) return;
    sheet.style.bottom = "-100%";
    if (overlay) overlay.classList.remove('opacity-100');
    setTimeout(() => { sheet.classList.add('hidden'); overlay?.classList.add('hidden'); }, 300);
}

async function executeMegaTopup() {
    if(!state.user) return toast("🔒 يرجى تسجيل الدخول أولاً");
    if(!state.selectedGame) return toast("⚠️ يرجى تحديد الخدمة");

    const inputEl = document.getElementById('mega-target-id');
    const targetId = inputEl ? inputEl.value.trim() : "";
    const fieldName = inputEl ? inputEl.getAttribute('data-fieldname') : "user_id";

    if(!targetId) return toast("⚠️ أدخل البيانات الحسابية المطلوبة");
    if(Number(state.user.bal) < currentUnitPrice) return toast("❌ رصيد محفظتك غير كافٍ");

    closeMegaModal();
    toast("⏳ جاري إرسال الطلب للسيرفر...");

    try {
        let res = await fetch(`${API}/api/games/topup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phone: state.user.phone,
                price: currentUnitPrice,
                quantity: 1,
                serviceId: state.selectedGame.ServiceApiID,
                serviceName: state.selectedGame.ServiceName_AR || state.selectedGame.ServiceName,
                user_id: targetId,
                fieldName: fieldName,
                type: "game"
            })
        });
        let data = await res.json();
        if(data.success) {
            if (data.currentBal !== undefined) {
                state.user.bal = data.currentBal;
            } else {
                await fetchUserData(); // مزامنة الرصيد حياً
            }
            localStorage.setItem('abu_user_v30', JSON.stringify(state.user));
            ui();
            toast("✅ تم الشحن بنجاح!");
        } else { toast("❌ فشل الشحن: " + (data.message || '')); }
    } catch(e) { toast("❌ عطل في الاتصال بالسيرفر"); }
}

// ==========================================
// ⚡ 11. باقات أم دراهم الفورية (التصفية الذكية)
// ==========================================
async function fetchPackagesFromDB() {
    const container = document.getElementById('packagesContainer');
    if (!container) return;

    const cachedPkgs = localStorage.getItem('abu_cache_packages');
    if (cachedPkgs) {
        try {
            dbPackages = JSON.parse(cachedPkgs);
        } catch(e){}
    }

    try {
        const response = await fetch(API_GET_PACKAGES, { signal: AbortSignal.timeout(4000) });
        const data = await response.json();
        const rawList = data.success && Array.isArray(data.packages) ? data.packages : (Array.isArray(data) ? data : []);

        const uniqueMap = new Map();
        rawList.forEach(pkg => {
            const title = (pkg.title || pkg.serviceName || '').trim();
            const price = Number(pkg.price || 0);
            const key = `${title}_${price}`;
            if (!uniqueMap.has(key)) uniqueMap.set(key, pkg);
        });

        dbPackages = Array.from(uniqueMap.values());
        localStorage.setItem('abu_cache_packages', JSON.stringify(dbPackages));
    } catch (error) {
        console.log("خطأ في جلب الباقات أوفلاين");
    }
    
    renderPackages();
}

function setupPhoneInputListener() {
    const phoneInput = document.getElementById('phoneInput');
    if (!phoneInput) return;

    phoneInput.addEventListener('input', function(e) {
        const val = e.target.value.trim();
        const badgeContainer = document.getElementById('netBadgeContainer');
        const badgeName = document.getElementById('netBadgeName');
        const netLogo = document.getElementById('netLogo');

        currentNetKey = null;
        if (badgeContainer) badgeContainer.classList.add('hidden');

        if (val.startsWith('77') || val.startsWith('78')) currentNetKey = 'YM';
        else if (val.startsWith('73')) currentNetKey = 'YOU';
        else if (val.startsWith('71')) currentNetKey = 'SABA';
        else if (val.startsWith('70')) currentNetKey = 'WYE';
        else if (val.startsWith('10') || val.startsWith('01')) currentNetKey = 'TELE';

        if (currentNetKey && NETWORKS[currentNetKey]) {
            const net = NETWORKS[currentNetKey];
            if (badgeName) badgeName.innerText = net.name;
            if (netLogo) netLogo.src = net.logo;
            if (badgeContainer) badgeContainer.classList.remove('hidden');
        }
        updateFilterTagsForNetwork();
        renderPackages();
    });
}

function updateFilterTagsForNetwork() {
    const container = document.getElementById('filterTagsContainer');
    if (!container) return;

    let tagsHTML = `<button onclick="setPackageTag('ALL', this)" class="tag-btn bg-[#c5a862] text-slate-950 text-xs font-bold px-4 py-2 rounded-xl whitespace-nowrap shadow-md transition">الكل</button>`;

    if (currentNetKey === 'YOU') {
        tagsHTML += `
            <button onclick="setPackageTag('YOU_SAWA', this)" class="tag-btn bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs px-4 py-2 rounded-xl whitespace-nowrap border border-slate-700 transition">سوا</button>
            <button onclick="setPackageTag('SOCIAL', this)" class="tag-btn bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs px-4 py-2 rounded-xl whitespace-nowrap border border-slate-700 transition">فئة</button>
            <button onclick="setPackageTag('MIX', this)" class="tag-btn bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs px-4 py-2 rounded-xl whitespace-nowrap border border-slate-700 transition">مكس الشهرية</button>
            <button onclick="setPackageTag('VOICE', this)" class="tag-btn bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs px-4 py-2 rounded-xl whitespace-nowrap border border-slate-700 transition">المكالمات</button>
            <button onclick="setPackageTag('SMS', this)" class="tag-btn bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs px-4 py-2 rounded-xl whitespace-nowrap border border-slate-700 transition">بلا حدود</button>
            <button onclick="setPackageTag('4G', this)" class="tag-btn bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs px-4 py-2 rounded-xl whitespace-nowrap border border-slate-700 transition">فورجي 4G</button>
            <button onclick="setPackageTag('SMART_NET', this)" class="tag-btn bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs px-4 py-2 rounded-xl whitespace-nowrap border border-slate-700 transition">سمارت فورجي</button>
            <button onclick="setPackageTag('UNIFIED', this)" class="tag-btn bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs px-4 py-2 rounded-xl whitespace-nowrap border border-slate-700 transition">باقة</button>
            <button onclick="setPackageTag('HILAL_4G', this)" class="tag-btn bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs px-4 py-2 rounded-xl whitespace-nowrap border border-slate-700 transition">هلال فورجي</button>
            <button onclick="setPackageTag('KSA', this)" class="tag-btn bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs px-4 py-2 rounded-xl whitespace-nowrap border border-slate-700 transition">باقات السعودية</button>
        `;
    } else if (currentNetKey === 'SABA') {
        tagsHTML += `
            <button onclick="setPackageTag('YABALASH', this)" class="tag-btn bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs px-4 py-2 rounded-xl whitespace-nowrap border border-slate-700 transition">يابلاش + واحد</button>
            <button onclick="setPackageTag('4G', this)" class="tag-btn bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs px-4 py-2 rounded-xl whitespace-nowrap border border-slate-700 transition">فورجي 4G</button>
            <button onclick="setPackageTag('SOCIAL', this)" class="tag-btn bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs px-4 py-2 rounded-xl whitespace-nowrap border border-slate-700 transition">التواصل الاجتماعي</button>
            <button onclick="setPackageTag('SUPER_NET', this)" class="tag-btn bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs px-4 py-2 rounded-xl whitespace-nowrap border border-slate-700 transition">سوبر نت</button>
            <button onclick="setPackageTag('SMS', this)" class="tag-btn bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs px-4 py-2 rounded-xl whitespace-nowrap border border-slate-700 transition">رسائل</button>
            <button onclick="setPackageTag('GSM', this)" class="tag-btn bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs px-4 py-2 rounded-xl whitespace-nowrap border border-slate-700 transition">جي اس ام GSM</button>
        `;
    } else if (currentNetKey === 'YM') {
        tagsHTML += `
            <button onclick="setPackageTag('YM_SOCIAL', this)" class="tag-btn bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs px-4 py-2 rounded-xl whitespace-nowrap border border-slate-700 transition">باقات تواصل</button>
            <button onclick="setPackageTag('VOLTE', this)" class="tag-btn bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs px-4 py-2 rounded-xl whitespace-nowrap border border-slate-700 transition">باقات فولتي (VoLTE)</button>
            <button onclick="setPackageTag('4G', this)" class="tag-btn bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs px-4 py-2 rounded-xl whitespace-nowrap border border-slate-700 transition">باقات إنترنت فورجي (4G)</button>
            <button onclick="setPackageTag('GIFTS', this)" class="tag-btn bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs px-4 py-2 rounded-xl whitespace-nowrap border border-slate-700 transition">الهدايا والمزايا</button>
            <button onclick="setPackageTag('3G_10DAYS', this)" class="tag-btn bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs px-4 py-2 rounded-xl whitespace-nowrap border border-slate-700 transition">ثري جي 10 أيام (3G)</button>
            <button onclick="setPackageTag('3G_MONTHLY', this)" class="tag-btn bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs px-4 py-2 rounded-xl whitespace-nowrap border border-slate-700 transition">ثري جي الشهرية (3G)</button>
            <button onclick="setPackageTag('SMS', this)" class="tag-btn bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs px-4 py-2 rounded-xl whitespace-nowrap border border-slate-700 transition">الرسائل والخدمات</button>
        `;
    } else {
        tagsHTML += `
            <button onclick="setPackageTag('4G', this)" class="tag-btn bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs px-4 py-2 rounded-xl whitespace-nowrap border border-slate-700 transition">فورجي (4G)</button>
            <button onclick="setPackageTag('VOICE', this)" class="tag-btn bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs px-4 py-2 rounded-xl whitespace-nowrap border border-slate-700 transition">اتصال وفولتي</button>
            <button onclick="setPackageTag('SMS', this)" class="tag-btn bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs px-4 py-2 rounded-xl whitespace-nowrap border border-slate-700 transition">رسائل</button>
        `;
    }
    container.innerHTML = tagsHTML;
    activePackageTag = 'ALL';
}

async function pickContactFromDevice() {
    if ('contacts' in navigator && 'select' in navigator.contacts) {
        try {
            const props = ['tel'];
            const opts = { multiple: false };
            const contacts = await navigator.contacts.select(props, opts);
            if (contacts && contacts.length > 0 && contacts[0].tel && contacts[0].tel.length > 0) {
                let rawNum = contacts[0].tel[0].replace(/\D/g, '');
                if (rawNum.startsWith('967')) rawNum = rawNum.substring(3);
                if (rawNum.startsWith('0')) rawNum = rawNum.substring(1);
                
                const phoneInput = document.getElementById('phoneInput');
                if (phoneInput) {
                    phoneInput.value = rawNum;
                    phoneInput.dispatchEvent(new Event('input'));
                }
                toast("✅ تم جلب الرقم بنجاح");
            }
        } catch (err) {
            console.log("Contact pick cancelled", err);
        }
    } else {
        toast("⚠️ متصفحك لا يدعم اختيار جهات الاتصال مباشرة");
    }
}

function setPackageTag(tag, btnEl) {
    activePackageTag = tag;
    document.querySelectorAll('.tag-btn').forEach(b => {
        b.className = "tag-btn bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs px-4 py-2 rounded-xl whitespace-nowrap border border-slate-700 transition";
    });
    if (btnEl) btnEl.className = "tag-btn bg-[#c5a862] text-slate-950 text-xs font-bold px-4 py-2 rounded-xl whitespace-nowrap shadow-md transition";
    renderPackages();
}

function renderPackages() {
    const container = document.getElementById('packagesContainer');
    if (!container) return;
    
    const phoneInput = document.getElementById('phoneInput');
    const targetPhone = phoneInput ? phoneInput.value.trim() : '';

    if (!targetPhone || targetPhone.length < 2 || !currentNetKey) {
        container.innerHTML = `<div class="col-span-full text-center py-12 text-xs text-amber-400/80 font-bold bg-slate-800/40 rounded-2xl border border-slate-700/50">📱 يرجى إدخال رقم الهاتف أولاً (مثال: 77xxxxxxx أو 73xxxxxxx) لعرض باقات الشبكة المخصصة</div>`;
        return;
    }

    const searchInput = document.getElementById('searchInput');
    const filterText = searchInput ? searchInput.value.toLowerCase() : '';

    const list = dbPackages.filter(p => {
        const matchesNet = p.net === currentNetKey;
        const title = (p.title || p.serviceName || '').toLowerCase();
        const matchesSearch = title.includes(filterText) || String(p.price).includes(filterText);
        
        let matchesTag = true;
        if (activePackageTag === '4G') {
            matchesTag = (title.includes('فورجي') || title.includes('4g')) && !title.includes('فولتي');
        } else if (activePackageTag === 'VOICE') {
            matchesTag = title.includes('اتصال') || title.includes('دقائق');
        } else if (activePackageTag === 'SMS') {
            matchesTag = title.includes('رسائل') || title.includes('رساله');
        } 
        else if (activePackageTag === 'YM_SOCIAL') {
            matchesTag = title.includes('تواصل') || title.includes('سوشيال') || title.includes('واتساب') || title.includes('مواقع');
        } else if (activePackageTag === 'VOLTE') {
            matchesTag = title.includes('فولتي') || title.includes('volte');
        } else if (activePackageTag === 'GIFTS') {
            matchesTag = title.includes('هدية') || title.includes('هدايا') || title.includes('مزايا');
        } else if (activePackageTag === '3G_10DAYS') {
            matchesTag = (title.includes('10 أيام') || title.includes('10 ايام') || title.includes('عشرة') || title.includes('10')) && title.includes('3g');
        } else if (activePackageTag === '3G_MONTHLY') {
            matchesTag = (title.includes('شهرية') || title.includes('شهر') || title.includes('30')) && title.includes('3g') && !title.includes('10');
        }
        else if (activePackageTag === 'YOU_SAWA') {
            matchesTag = title.includes('سوا');
        } else if (activePackageTag === 'SOCIAL') {
            matchesTag = title.includes('تواصل') || title.includes('سوشيال') || title.includes('واتساب');
        } else if (activePackageTag === 'MIX') {
            matchesTag = title.includes('مكس');
        } else if (activePackageTag === 'SMART_NET') {
            matchesTag = title.includes('سمارت نت') || title.includes('سمارت');
        } else if (activePackageTag === 'UNIFIED') {
            matchesTag = title.includes('الربط الموحد') || title.includes('موحد');
        } else if (activePackageTag === 'HILAL_4G') {
            matchesTag = title.includes('هلال');
        } else if (activePackageTag === 'KSA') {
            matchesTag = title.includes('السعودية') || title.includes('السعوديه');
        }
        else if (activePackageTag === 'YABALASH') {
            matchesTag = title.includes('يابلاش') || title.includes('واحد');
        } else if (activePackageTag === 'SUPER_NET') {
            matchesTag = title.includes('سوبر نت') || title.includes('سوبر');
        } else if (activePackageTag === 'GSM') {
            matchesTag = title.includes('جي اس ام') || title.includes('gsm');
        }

        return matchesNet && matchesSearch && matchesTag;
    });

    if (list.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center py-8 text-xs text-slate-500">لا توجد باقات مطابقة للبحث أو الفلتر المحدد لهذا الرقم</div>`;
        return;
    }

    container.innerHTML = list.map(pkg => {
        const title = pkg.title || pkg.serviceName;
        const img = pkg.img || NETWORKS[pkg.net]?.logo || 'https://i.postimg.cc/BZrr0yD7/images-2026-07-06T163911-011.jpg';
        const netName = NETWORKS[pkg.net]?.name || 'خدمات رقمية';

        return `
            <div onclick="openConfirmModal('${pkg.serviceId}', '${pkg.psi || 46}', ${pkg.price}, '${title}', '${img}', '${netName}')" class="p-3 bg-slate-800/90 rounded-2xl border border-slate-700/80 hover:border-[#c5a862]/60 flex flex-col items-center text-center cursor-pointer active:scale-[0.98] transition">
                <img src="${img}" onerror="this.src='https://i.postimg.cc/BZrr0yD7/images-2026-07-06T163911-011.jpg'" class="w-12 h-12 object-contain bg-black/40 rounded-xl p-1 mb-2">
                <h3 class="font-bold text-xs text-white truncate w-full mb-1">${title}</h3>
                <p class="text-[10px] text-slate-400 mb-2">${netName}</p>
                <div class="mt-auto w-full flex items-center justify-between pt-2 border-t border-slate-700/50">
                    <span class="text-[10px] font-black text-[#c5a862] font-mono">${pkg.price} YER</span>
                    <span class="text-[9px] bg-[#c5a862] text-black font-black px-2 py-0.5 rounded">شحن</span>
                </div>
            </div>
        `;
    }).join('');
}

function filterPackages() { renderPackages(); }

function openConfirmModal(serviceId, psi, price, title, img, netName) {
    const phoneInput = document.getElementById('phoneInput');
    const targetPhone = phoneInput ? phoneInput.value.trim() : "";

    if (!targetPhone || targetPhone.length < 8) {
        toast('⚠️ أدخل رقم الهاتف المستهدف بشكل صحيح أولاً!');
        phoneInput?.focus();
        return;
    }

    selectedPackage = { serviceId: String(serviceId), psi: parseInt(psi) || 46, price: Number(price), title, img, netName };

    document.getElementById('modalPkgImg').src = img;
    document.getElementById('modalPkgTitle').innerText = title;
    document.getElementById('modalPrice').innerText = `${price} YER`;
    document.getElementById('modalPhone').innerText = targetPhone;
    document.getElementById('modalNetName').innerText = netName;
    document.getElementById('confirmModal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('confirmModal').classList.add('hidden');
}

async function executeTopup() {
    const phoneInput = document.getElementById('phoneInput');
    const targetPhone = phoneInput ? phoneInput.value.trim() : "";
    const actValue = parseInt(document.getElementById('modalAct').value) || 1;
    const btn = document.getElementById('btnConfirm');

    if (!selectedPackage) return closeModal();
    if (!state.user) return toast("🔒 سجل دخولك أولاً");
    if (Number(state.user.bal) < Number(selectedPackage.price)) {
        closeModal();
        return toast("❌ رصيد المحفظة غير كافٍ");
    }

    if (btn) { btn.disabled = true; btn.innerText = "جاري إرسال التسديد... ⏳"; }
    closeModal();

    const operationId = "TXN-" + Math.floor(100000 + Math.random() * 900000);

    try {
        const response = await fetch(API_EXECUTE_TOPUP, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
                phone: state.user.phone,
                mobileNumber: targetPhone,
                serviceId: selectedPackage.serviceId,
                PSI: selectedPackage.psi,
                price: selectedPackage.price,
                serviceName: selectedPackage.title,
                ACT: actValue, AC: 1,
                transaction_id: operationId
            })
        });

        const data = await response.json();

        if (response.ok && (data.success || data.status === 'success')) {
            if (data.currentBal !== undefined) {
                state.user.bal = data.currentBal;
            } else {
                await fetchUserData(); // تحديث فوري وحي للرصيد
            }
            localStorage.setItem('abu_user_v30', JSON.stringify(state.user));
            ui();

            try { document.getElementById('snd-cashier')?.play().catch(()=>{}); } catch(e){}
            
            toast(`🎉 تم التسديد بنجاح للرقم ${targetPhone}!`);
            phoneInput.value = '';
            document.getElementById('netBadgeContainer')?.classList.add('hidden');
            renderPackages();
        } else {
            toast(`❌ فشل التسديد: ${data.message || 'رفض الطلب من المزود'}`);
        }
    } catch (e) {
        toast("⚠️ خطأ في الاتصال بالخادم");
    } finally {
        if (btn) { btn.disabled = false; btn.innerText = "✅ تأكيد الدفع الفوري"; }
    }
}

// ==========================================
// 👤 12. الحساب والمحفظة والتحكم بالواجهة الملكية
// ==========================================
function ui() {
    if(!state.user) return;
    const balEl = document.getElementById('u-balance-top');
    if (balEl) balEl.innerText = Number(state.user.bal || 0).toLocaleString() + " YER";
    
    const accNameEl = document.getElementById('acc-name');
    const accPhoneEl = document.getElementById('acc-phone');
    const accAvatarEl = document.getElementById('acc-avatar-large');
    
    if (accNameEl) accNameEl.innerText = state.user.name || "عميل";
    if (accPhoneEl) accPhoneEl.innerText = state.user.phone || "";
    if (accAvatarEl && state.user.name) accAvatarEl.innerText = state.user.name.charAt(0);
    
    const cartList = document.getElementById('cart-list');
    const total = state.cart.reduce((s, i) => s + (Number(i.price) * Number(i.qty)), 0);
    const totalQty = state.cart.reduce((s, i) => s + Number(i.qty), 0);
    
    const cartTotalEl = document.getElementById('cart-total');
    if (cartTotalEl) cartTotalEl.innerText = total.toLocaleString() + " YER";
    
    const cartDot = document.getElementById('cart-dot');
    if (cartDot) {
        if (totalQty > 0) { cartDot.innerText = totalQty; cartDot.classList.remove('hidden'); }
        else { cartDot.classList.add('hidden'); }
    }

    if(cartList) {
        cartList.innerHTML = state.cart.length > 0 ? state.cart.map(i => {
            const pId = i._id?.$oid || i._id;
            return `
                <div class="p-4 bg-[#121418] rounded-2xl flex justify-between items-center border border-[#1d2127]">
                    <div class="text-right">
                        <h4 class="font-bold text-sm text-[#c5a862]">${i.name}</h4>
                        <p class="text-xs text-slate-400 mt-1 font-mono">${(Number(i.price) * Number(i.qty)).toLocaleString()} YER</p>
                    </div>
                    <div class="flex items-center gap-3 bg-[#0d0f11] px-3 py-1.5 rounded-xl border border-[#1d2127]">
                        <button onclick="updateQty('${pId}', -1)" class="px-2 text-slate-400 font-bold">-</button>
                        <span class="text-xs font-black text-white font-mono">${i.qty}</span>
                        <button onclick="updateQty('${pId}', 1)" class="px-2 text-[#c5a862] font-bold">+</button>
                    </div>
                </div>`;
        }).join('') : `<div class="text-center py-12 text-xs text-slate-500 font-bold">حقيبة التسوق فارغة</div>`;
    }
}

function changeView(viewId, btn) {
    try { document.getElementById('snd-click')?.play().catch(()=>{}); } catch(e){}
    document.querySelectorAll('.view-content').forEach(v => v.classList.add('hidden'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(`view-${viewId}`)?.classList.remove('hidden');
    if(btn) btn.classList.add('active');
    
    if (viewId === 'orders') loadOrders();
    if (viewId === 'notifications' || viewId === 'real-notifications') fetchMessages();
    
    if (state.viewHistory[state.viewHistory.length - 1] !== viewId) {
        state.viewHistory.push(viewId);
        try { history.pushState({ page: viewId }, ""); } catch(e){}
    }
}

function changeViewSilent(viewId) {
    document.querySelectorAll('.view-content').forEach(v => v.classList.add('hidden'));
    document.getElementById(`view-${viewId}`)?.classList.remove('hidden');
}

function navigateBack() { window.dispatchEvent(new Event('popstate')); }

function toast(m) { 
    const t = document.getElementById('toast'); if(!t) return;
    t.innerText = m; t.classList.remove('hidden'); setTimeout(() => t.classList.add('hidden'), 3500); 
}

async function manualRefresh() {
    toast("🔄 جاري التحديث...");
    await fetchUserData(); // جلب فوري من السيرفر
    ui();
    initProducts();
    fetchAds();
    fetchGames();
    fetchMessages();
    fetchPackagesFromDB();
}

