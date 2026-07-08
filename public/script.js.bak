const API = window.location.origin; 
const WHATSAPP_NUMBER = "+967737528057";

let state = {
    categories: [],
    prods: [],
    cart: [],
    layoutMode: 0, // 0: dual, 1: matrix, 2: list
    user: JSON.parse(localStorage.getItem('abu_user_v30')) || null,
    games: [],
    selectedGame: null,
    selectedDenom: null
};

// ================= 1. البداية والتشغيل =================
window.onload = () => {
    setTimeout(() => {
        if (state.user) unlockApp();
        else {
            document.getElementById('splash').classList.add('hidden');
            document.getElementById('auth-screen').classList.remove('hidden');
        }
    }, 2000);
};

async function unlockApp() {
    document.getElementById('splash').classList.add('hidden');
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-layout').classList.remove('hidden');
    ui();
    await initProducts();
    await fetchAds();
    await fetchGames();
    await fetchMessages();
}

// ================= 2. جلب البيانات من السيرفر =================
async function initProducts() {
    try {
        let rCat = await fetch(`${API}/api/categories`);
        state.categories = await rCat.json();
        let rProd = await fetch(`${API}/api/products`);
        state.prods = await rProd.json();
        renderCategories();
    } catch (e) { toast("❌ عطل في جلب المنتجات"); }
}

async function fetchAds() {
    try {
        let res = await fetch(`${API}/api/ads`);
        let ads = await res.json();
        const container = document.getElementById('ad-video-container');
        const player = document.getElementById('ad-video-player');
        if (ads && ads.length > 0 && ads[0].videoUrl) {
            let url = ads[0].videoUrl;
            if(url.includes("watch?v=")) url = url.replace("watch?v=", "embed/");
            player.src = url;
            container.classList.remove('hidden');
        } else { container.classList.add('hidden'); }
    } catch(e) {}
}

async function fetchGames() {
    try {
        let res = await fetch(`${API}/api/games`);
        let data = await res.json();
        if(data.success) {
            state.games = data.game_list;
            const list = document.getElementById('games-list');
            list.innerHTML = state.games.map(g => `
                <div onclick="selectGame('${g.game_code}')" class="p-5 bg-white/5 rounded-3xl border border-white/5 flex justify-between items-center cursor-pointer active:scale-[0.98]">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-500 text-lg">
                            <i class="fas fa-gamepad"></i>
                        </div>
                        <div><h3 class="font-black text-sm">${g.game_name}</h3><p class="text-[9px] text-emerald-500 font-bold">شحن مباشر تلقائي ⚡</p></div>
                    </div>
                    <i class="fas fa-chevron-left text-xs text-slate-500"></i>
                </div>
            `).join('');
        }
    } catch(e) { console.log("Games Error"); }
}

async function fetchMessages() {
    if(!state.user) return;
    try {
        const res = await fetch(`${API}/api/messages/${state.user.phone}`);
        const data = await res.json();
        const list = document.getElementById('messages-list');
        if(data && data.length > 0) {
            document.getElementById('msg-dot').classList.remove('hidden');
            list.innerHTML = data.map(m => `
                <div class="p-5 bg-white/5 rounded-3xl border border-white/5">
                    <div class="flex justify-between items-start mb-2">
                        <span class="text-[9px] text-emerald-500 font-bold bg-emerald-500/10 px-2 py-1 rounded-lg">${m.date}</span>
                        <i class="fas fa-envelope-open text-emerald-500 opacity-20"></i>
                    </div>
                    <h3 class="text-sm font-black mb-1">${m.title}</h3>
                    <p class="text-[11px] text-slate-400 leading-relaxed">${m.body}</p>
                </div>
            `).join('');
        } else {
            document.getElementById('msg-dot').classList.add('hidden');
            list.innerHTML = `<div class="opacity-30 text-center py-20 text-xs font-bold">لا توجد رسائل جديدة</div>`;
        }
    } catch(e) { console.log("Msg Error"); }
}

// ================= 3. عرض المنتجات والتحكم بالشبكة =================
function renderCategories() {
    const list = document.getElementById('categories-list');
    if(!list) return;
    list.innerHTML = state.categories.map(c => `
        <div onclick="openCategory('${c.name}')" class="card-glass animate-fadeIn">
            <img src="${c.img}" class="w-full h-32 object-cover rounded-2xl mb-3">
            <h3 class="font-black text-sm text-slate-100">${c.name}</h3>
            <p class="text-[9px] text-slate-500 mt-1">${c.sub || 'خدمات متميزة'}</p>
        </div>
    `).join('');
}

function setLayout(mode) {
    const container = document.getElementById('categories-list');
    if(!container) return;
    
    container.classList.remove('mode-matrix', 'mode-dual', 'mode-list');
    document.querySelectorAll('[id^="btn-layout-"]').forEach(b => {
        b.classList.remove('bg-emerald-500', 'text-black');
        b.classList.add('text-slate-400');
    });

    const activeBtn = document.getElementById(`btn-layout-${mode}`);
    if(activeBtn) {
        activeBtn.classList.remove('text-slate-400');
        activeBtn.classList.add('bg-emerald-500', 'text-black');
    }
    
    if(mode === 0) container.classList.add('mode-dual');
    else if(mode === 1) container.classList.add('mode-matrix');
    else if(mode === 2) container.classList.add('mode-list');
    state.layoutMode = mode;
    playSound('snd-click');
}

function openCategory(catName) {
    document.getElementById('cat-title-display').innerText = catName;
    const list = document.getElementById('products-list');
    const filtered = state.prods.filter(p => p.cat === catName);
    if(filtered.length > 0) {
        list.innerHTML = filtered.map(p => `
            <div onclick="openProductSheet('${p._id}')" class="p-4 bg-white/5 rounded-3xl border border-white/5 flex gap-4 items-center cursor-pointer active:scale-[0.99] transition">
                <img src="${p.img}" class="w-20 h-20 object-cover rounded-2xl">
                <div class="flex-1">
                    <h3 class="font-black text-sm">${p.name}</h3>
                    <p class="text-xs text-emerald-400 font-bold mt-1">${Number(p.price).toLocaleString()} YER</p>
                </div>
                <i class="fas fa-plus text-xs text-emerald-500 bg-emerald-500/10 p-3 rounded-xl"></i>
            </div>
        `).join('');
    } else {
        list.innerHTML = `<div class="opacity-30 text-center py-12 text-xs font-bold">لا توجد منتجات</div>`;
    }
    document.getElementById('view-home').classList.add('hidden');
    document.getElementById('view-products').classList.remove('hidden');
    playSound('snd-click');
}

// ================= 4. نظام الموقع والدفع المتعدد =================
function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) { toast("⚠️ الموقع غير مدعوم"); reject(); }
        navigator.geolocation.getCurrentPosition(
            (p) => resolve({ link: `https://www.google.com/maps?q=${p.coords.latitude},${p.coords.longitude}` }),
            (e) => { alert("❌ يجب تفعيل GPS لإتمام الطلب"); reject(e); },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    });
}

async function processOrder(method) {
    if (state.cart.length === 0) return toast("🛒 السلة فارغة");
    const total = state.cart.reduce((s, i) => s + (i.price * i.qty), 0);
    if (method === 'wallet' && state.user.bal < total) return toast("❌ رصيدك غير كافٍ");

    toast("⏳ جاري تحديد موقعك...");
    try {
        const location = await getUserLocation();
        if (method === 'whatsapp') {
            let msg = `*طلب جديد من: ${state.user.name}*\n*الإجمالي: ${total} YER*\n*الموقع:* ${location.link}`;
            window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
            state.cart = []; ui();
        } else {
            submitOrderToDB(location, total, method === 'wallet' ? "دفع محفظة" : "دفع عند الاستلام");
        }
    } catch (e) {}
}

async function submitOrderToDB(loc, total, paymentType) {
    toast("⏳ جاري الإرسال...");
    try {
        let res = await fetch(`${API}/api/orders/add`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ phone: state.user.phone, order: { total, items: state.cart, location: loc.link, paymentMethod: paymentType } })
        });
        if (res.ok) {
            let data = await res.json();
            playSound('snd-cashier');
            toast(`✅ تم تسجيل الطلب!`);
            state.cart = [];
            if(paymentType === "دفع محفظة") state.user.bal = data.currentBal;
            localStorage.setItem('abu_user_v30', JSON.stringify(state.user));
            ui();
            changeView('orders', document.querySelector("button[onclick*='orders']"));
        }
    } catch(e) { toast("❌ عطل في الشبكة"); }
}

// ================= 5. نظام شحن الألعاب =================
function selectGame(code) {
    const g = state.games.find(x => x.game_code === code);
    state.selectedGame = g;
    document.getElementById('selected-game-title').innerText = g.game_name;
    document.getElementById('game-denoms-list').innerHTML = g.denominations.map(d => `
        <div onclick="pickDenom(this, '${d.id}')" class="denom-card p-4 bg-black/40 border border-white/5 rounded-2xl text-center cursor-pointer transition">
            <p class="text-xs font-black">${d.name}</p>
            <p class="text-[10px] text-emerald-400 mt-1 font-bold">${d.price.toLocaleString()} YER</p>
        </div>
    `).join('');
    document.getElementById('game-topup-panel').classList.remove('hidden');
    document.getElementById('game-topup-panel').scrollIntoView({ behavior: 'smooth' });
}

function pickDenom(el, id) {
    document.querySelectorAll('.denom-card').forEach(c => c.classList.remove('border-emerald-500', 'bg-emerald-500/5'));
    el.classList.add('border-emerald-500', 'bg-emerald-500/5');
    state.selectedDenom = state.selectedGame.denominations.find(x => x.id === id);
    playSound('snd-click');
}

async function validatePlayer() {
    const id = document.getElementById('game-player-id').value;
    if(!id) return toast("⚠️ أدخل الـ ID");
    let res = await fetch(`${API}/api/games/validate-user`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ game_code: state.selectedGame.game_code, user_id: id })
    });
    let data = await res.json();
    if(data.success) {
        const d = document.getElementById('player-name-display');
        d.innerText = "👤 اسم اللاعب: " + data.player_name;
        d.classList.remove('hidden');
    }
}

async function processGameTopup() {
    const id = document.getElementById('game-player-id').value;
    if(!id || !state.selectedDenom) return toast("⚠️ أكمل البيانات");
    if(state.user.bal < state.selectedDenom.price) return toast("❌ رصيدك لا يكفي");
    toast("⚡ جاري الشحن...");
    let res = await fetch(`${API}/api/games/topup`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ phone: state.user.phone, game_code: state.selectedGame.game_code, user_id: id, denomination_id: state.selectedDenom.id, price: state.selectedDenom.price })
    });
    let data = await res.json();
    if(data.success) {
        playSound('snd-cashier'); toast("✅ تم الشحن بنجاح!");
        state.user.bal = data.currentBal;
        localStorage.setItem('abu_user_v30', JSON.stringify(state.user));
        ui();
        document.getElementById('game-topup-panel').classList.add('hidden');
    } else { toast("❌ " + data.message); }
}

// ================= 6. الفواتير والعمليات =================
async function loadOrders() {
    const list = document.getElementById('orders-list');
    if(!list) return;
    try {
        let res = await fetch(`${API}/api/orders/${state.user.phone}`);
        let orders = await res.json();
        list.innerHTML = orders.length > 0 ? orders.map(o => `
            <div class="p-5 bg-white/5 rounded-3xl border border-white/5 space-y-3">
                <div class="flex justify-between">
                    <span class="text-xs font-black text-emerald-400">${o.id || 'فاتورة'}</span>
                    <span class="text-[10px] px-3 py-1 bg-white/5 rounded-lg border border-white/5 text-slate-400">${o.status}</span>
                </div>
                <div class="text-xs text-slate-400">${o.items.map(i => `• ${i.name} (x${i.qty})`).join('<br>')}</div>
                <div class="flex justify-between border-t border-white/5 pt-2">
                    <span class="text-[9px] text-slate-500">${o.date}</span>
                    <span class="text-sm font-black text-emerald-400">${o.total.toLocaleString()} YER</span>
                </div>
            </div>`).join('') : `<div class="text-center py-12 text-xs text-slate-500">لا توجد عمليات</div>`;
    } catch (e) { list.innerHTML = "خطأ في جلب البيانات"; }
}

// ================= 7. الوظائف العامة والـ UI =================
function ui() {
    if(!state.user) return;
    document.getElementById('u-balance-top').innerText = Number(state.user.bal).toLocaleString() + " YER";
    document.getElementById('acc-name').innerText = state.user.name;
    document.getElementById('acc-phone').innerText = state.user.phone;
    document.getElementById('u-avatar').innerText = state.user.name.charAt(0);
    document.getElementById('acc-avatar-large').innerText = state.user.name.charAt(0);
    document.getElementById('acc-date').innerText = state.user.joinDate || "مستمر";

    const cartList = document.getElementById('cart-list');
    const total = state.cart.reduce((s, i) => s + (i.price * i.qty), 0);
    document.getElementById('cart-total').innerText = total.toLocaleString() + " YER";
    
    if(state.cart.length > 0) {
        cartList.innerHTML = state.cart.map(i => `
            <div class="p-4 bg-white/5 rounded-2xl flex justify-between items-center border border-white/5">
                <div><h4 class="font-bold text-sm">${i.name}</h4><p class="text-xs text-emerald-400 mt-1">${(i.price * i.qty).toLocaleString()} YER</p></div>
                <div class="flex items-center gap-3 bg-black/40 px-3 py-1.5 rounded-xl border border-white/5">
                    <button onclick="updateQty('${i._id}', -1)" class="px-2">-</button>
                    <span class="text-xs font-black">${i.qty}</span>
                    <button onclick="updateQty('${i._id}', 1)" class="px-2 text-emerald-400">+</button>
                </div>
            </div>`).join('');
    } else { cartList.innerHTML = `<div class="text-center py-12 text-xs text-slate-500 font-bold">حقيبة التسوق فارغة</div>`; }
}

async function handleAuth() {
    const isSignup = !document.getElementById('signup-name-container').classList.contains('hidden');
    const name = document.getElementById('auth-name').value;
    const phone = document.getElementById('auth-phone').value;
    const pass = document.getElementById('auth-pass').value;

    if(!phone || !pass || (isSignup && !name)) return toast("⚠️ الرجاء ملء كافة الحقول");
    let url = isSignup ? `${API}/api/auth/signup` : `${API}/api/auth/login`;
    
    toast("⏳ جاري التحقق...");
    try {
        let res = await fetch(url, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name, phone, pass}) });
        let data = await res.json();
        if(data.success) {
            state.user = data.user;
            localStorage.setItem('abu_user_v30', JSON.stringify(state.user));
            unlockApp();
        } else { toast("❌ " + data.message); }
    } catch(e) { toast("❌ عطل في السيرفر"); }
}

async function changeView(viewId, btn) {
    playSound('snd-click');
    document.querySelectorAll('.view-content').forEach(v => v.classList.add('hidden'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(`view-${viewId}`).classList.remove('hidden');
    if(btn) btn.classList.add('active');
    
    if(viewId === 'orders') loadOrders();
    if(viewId === 'notifications') fetchMessages();
    if(viewId === 'home') fetchAds();
    ui();
}

// وظائف مساعدة أخرى
function addToCart(p) { let i = state.cart.find(x => x._id === p._id); if(i) i.qty++; else state.cart.push({...p, qty:1}); ui(); toast("🛒 أضيف للسلة"); }
function updateQty(id, delta) { let i = state.cart.find(x => x._id === id); if(i) { i.qty += delta; if(i.qty <= 0) state.cart = state.cart.filter(x => x._id !== id); ui(); } }
function toast(m) { const t = document.getElementById('toast'); t.innerText = m; t.classList.remove('hidden'); setTimeout(() => t.classList.add('hidden'), 3500); }
function logout() { localStorage.clear(); location.reload(); }
function closeSheet() { document.getElementById('product-sheet').style.bottom = "-100%"; setTimeout(() => document.getElementById('sheet-overlay').classList.add('hidden'), 500); }
function playSound(id) { const s = document.getElementById(id); if(s) { s.currentTime = 0; s.play().catch(e=>{}); } }
function toggleAuthMode() {
    const container = document.getElementById('signup-name-container');
    const title = document.getElementById('auth-title');
    container.classList.toggle('hidden');
    title.innerText = container.classList.contains('hidden') ? "تسجيل الدخول" : "إنشاء حساب";
}
function openProductSheet(id) {
    const p = state.prods.find(x => x._id === id);
    document.getElementById('sh-img').src = p.img;
    document.getElementById('sh-name').innerText = p.name;
    document.getElementById('sh-price').innerText = Number(p.price).toLocaleString() + " YER";
    document.getElementById('sh-add-btn').onclick = () => { addToCart(p); closeSheet(); };
    document.getElementById('sheet-overlay').classList.remove('hidden');
    setTimeout(() => document.getElementById('product-sheet').style.bottom = "0", 10);
}
async function sync() {
    if(!state.user) return;
    try {
        const res = await fetch(`${API}/api/auth/user/${state.user.phone}`);
        const data = await res.json();
        if(res.ok && data.success) { state.user = data.user; localStorage.setItem('abu_user_v30', JSON.stringify(state.user)); ui(); }
    } catch(e) {}
}
setInterval(() => { if(state.user) sync(); }, 20000);

// ================= 8. نظام إشعارات Firebase =================

// --- إعدادات Firebase من لوحة تحكم Firebase الخاصة بك ---
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// تهيئة Firebase
if (firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
}
const messaging = firebase.messaging();

// طلب الإذن والحصول على التوكين
async function initNotifications() {
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const token = await messaging.getToken({ vapidKey: 'YOUR_PUBLIC_VAPID_KEY' });
            if (token && state.user) {
                // إرسال التوكين للسيرفر لربطه بحساب المستخدم
                fetch(`${API}/api/auth/update-fcm`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone: state.user.phone, fcmToken: token })
                });
            }
        }
    } catch (error) {
        console.error("FCM Error:", error);
    }
}

// استقبال الإشعار والتطبيق مفتوح (Foreground)
messaging.onMessage((payload) => {
    console.log('Message received. ', payload);
    // تفعيل النقطة الحمراء فوراً في الواجهة
    const msgDot = document.getElementById('msg-dot');
    if (msgDot) msgDot.classList.remove('hidden');
    
    // تشغيل صوت التنبيه
    playSound('snd-notification');
    
    // عرض رسالة سريعة للمستخدم
    toast(`🔔 ${payload.notification.title}: ${payload.notification.body}`);
});

// استدعاء الوظيفة عند فتح التطبيق بنجاح عبر تغليف الدالة الأصلية
const originalUnlockApp = unlockApp;
unlockApp = async function() {
    await originalUnlockApp();
    initNotifications(); // تفعيل الإشعارات بعد فك القفل بنجاح
};
