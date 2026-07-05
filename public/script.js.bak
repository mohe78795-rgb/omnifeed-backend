const API = window.location.origin; 
const WHATSAPP_NUMBER = "+967737528057";

let state = {
    categories: [],
    prods: [],
    cart: [],
    layoutMode: 0,
    user: JSON.parse(localStorage.getItem('abu_user_v30')) || null,
    games: [],
    selectedGame: null,
    selectedDenom: null
};

// ================= 1. نظام الدخول والتحقق (Database) =================
async function handleAuth() {
    const isSignup = !document.getElementById('signup-name-container').classList.contains('hidden');
    const name = document.getElementById('auth-name').value;
    const phone = document.getElementById('auth-phone').value;
    const pass = document.getElementById('auth-pass').value;

    if(!phone || !pass || (isSignup && !name)) return toast("⚠️ الرجاء ملء كافة الحقول");

    let url = isSignup ? `${API}/api/auth/signup` : `${API}/api/auth/login`;
    let body = isSignup ? { name, phone, pass } : { phone, pass };

    toast("⏳ جاري التحقق من الحساب...");
    try {
        let res = await fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(body)
        });
        let data = await res.json();
        if(data.success) {
            state.user = data.user;
            localStorage.setItem('abu_user_v30', JSON.stringify(state.user));
            toast("✅ أهلاً بك! تم الدخول بنجاح");
            unlockApp();
        } else {
            toast("❌ " + data.message);
        }
    } catch(e) { toast("❌ فشل الاتصال بالسيرفر المركزي"); }
}

async function sync() {
    if(!state.user) return;
    try {
        const res = await fetch(`${API}/api/auth/user/${state.user.phone}`);
        const data = await res.json();
        if(res.ok && data.success) {
            state.user = data.user;
            localStorage.setItem('abu_user_v30', JSON.stringify(state.user));
            ui();
        }
    } catch(e) { console.log("Sync failed"); }
}

// ================= 2. نظام الفواتير والعمليات (Database) =================
async function loadOrders() {
    const list = document.getElementById('orders-list');
    if(!list || !state.user) return;
    
    list.innerHTML = `<div class="text-center py-10 opacity-50">⏳ جاري تحميل سجل العمليات...</div>`;
    
    try {
        let res = await fetch(`${API}/api/orders/${state.user.phone}`);
        let orders = await res.json();
        if(orders && orders.length > 0) {
            list.innerHTML = orders.map(o => `
                <div class="p-5 bg-white/5 rounded-3xl border border-white/5 space-y-3 animate-fadeIn">
                    <div class="flex justify-between items-center">
                        <span class="text-xs font-black text-emerald-400">${o.id || 'ORDER-ID'}</span>
                        <span class="text-[10px] px-3 py-1 bg-white/5 rounded-lg border border-white/5 text-slate-400 font-bold">${o.status}</span>
                    </div>
                    <div class="text-xs text-slate-400 space-y-1">
                        ${o.items.map(i => `<div>• ${i.name} (x${i.qty})</div>`).join('')}
                    </div>
                    <div class="flex justify-between items-center pt-2 border-t border-white/5">
                        <span class="text-[9px] text-slate-500">${o.date}</span>
                        <span class="text-sm font-black text-emerald-400">${Number(o.total).toLocaleString()} YER</span>
                    </div>
                    ${o.location ? `<a href="${o.location}" target="_blank" class="text-[9px] text-blue-400 block mt-1"><i class="fas fa-map-marker-alt"></i> عرض موقع التوصيل</a>` : ''}
                </div>
            `).join('');
        } else {
            list.innerHTML = `<div class="text-center py-12 text-xs text-slate-500 font-bold">لا توجد عمليات سابقة في سجل هذا الحساب</div>`;
        }
    } catch (e) { 
        list.innerHTML = `<div class="text-center text-red-500 py-10 text-xs">عطل في جلب البيانات</div>`; 
    }
}

// ================= 3. نظام الإعلانات والفيديو (Database) =================
async function fetchAds() {
    try {
        let res = await fetch(`${API}/api/ads`);
        let ads = await res.json();
        const container = document.getElementById('ad-video-container');
        const player = document.getElementById('ad-video-player');

        if (ads && ads.length > 0 && ads[0].videoUrl) {
            let embedUrl = ads[0].videoUrl;
            if(embedUrl.includes("watch?v=")) {
                embedUrl = embedUrl.replace("watch?v=", "embed/");
            }
            player.src = embedUrl;
            container.classList.remove('hidden');
        } else {
            container.classList.add('hidden');
        }
    } catch(e) { console.log("Ad Fetch Error"); }
}

// ================= 4. الميزات الجديدة (الموقع والدفع) =================
function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            toast("⚠️ متصفحك لا يدعم تحديد الموقع");
            reject("Not supported");
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => resolve({
                link: `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`
            }),
            (err) => {
                alert("❌ يجب تفعيل الـ GPS لإتمام الطلب.");
                reject(err);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    });
}

async function processOrder(method) {
    if (state.cart.length === 0) return toast("🛒 سلتك فارغة!");
    const total = state.cart.reduce((s, i) => s + (i.price * i.qty), 0);
    if (method === 'wallet' && state.user.bal < total) return toast("❌ رصيدك لا يكفي");

    toast("⏳ جاري تحديد موقعك...");
    try {
        const location = await getUserLocation();
        if (method === 'whatsapp') {
            sendToWhatsApp(location, total);
        } else {
            submitOrderToDB(location, total, method === 'wallet' ? "دفع محفظة" : "دفع عند الاستلام");
        }
    } catch (err) {}
}

async function submitOrderToDB(loc, total, paymentType) {
    toast("⏳ جاري إرسال الطلب للسيرفر...");
    try {
        let res = await fetch(`${API}/api/orders/add`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                phone: state.user.phone, 
                order: { total, items: state.cart, location: loc.link, paymentMethod: paymentType } 
            })
        });
        if (res.ok) {
            let data = await res.json();
            playSound('snd-cashier');
            toast(`✅ تم التسجيل بنجاح!`);
            state.cart = [];
            if(paymentType === "دفع محفظة") state.user.bal = data.currentBal;
            localStorage.setItem('abu_user_v30', JSON.stringify(state.user));
            ui();
            changeView('orders', document.querySelector("button[onclick*='orders']"));
        }
    } catch(e) { toast("❌ عطل في الشبكة"); }
}

function sendToWhatsApp(loc, total) {
    let msg = `*طلب جديد*%0A*العميل:* ${state.user.name}%0A*الإجمالي:* ${total} YER%0A*الموقع:* ${loc.link}`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank');
    state.cart = [];
    ui();
}

// ================= 5. بقية الوظائف الأساسية =================
function ui() {
    if(!state.user) return;
    document.getElementById('u-balance-top').innerText = Number(state.user.bal).toLocaleString() + " YER";
    document.getElementById('acc-name').innerText = state.user.name;
    document.getElementById('acc-phone').innerText = state.user.phone;
    document.getElementById('acc-date').innerText = state.user.joinDate || "مستمر";
    document.getElementById('u-avatar').innerText = state.user.name.charAt(0);
    document.getElementById('acc-avatar-large').innerText = state.user.name.charAt(0);

    const cartList = document.getElementById('cart-list');
    const total = state.cart.reduce((s, i) => s + (i.price * i.qty), 0);
    document.getElementById('cart-total').innerText = total.toLocaleString() + " YER";
    
    if(state.cart.length > 0) {
        cartList.innerHTML = state.cart.map(i => `
            <div class="p-4 bg-white/5 rounded-2xl flex justify-between items-center border border-white/5">
                <div><h4 class="font-bold text-sm">${i.name}</h4><p class="text-xs text-emerald-400 mt-1">${(i.price * i.qty).toLocaleString()} YER</p></div>
                <div class="flex items-center gap-3 bg-black/40 px-3 py-1.5 rounded-xl border border-white/5">
                    <button onclick="updateQty('${i._id}', -1)">-</button>
                    <span class="text-xs font-black">${i.qty}</span>
                    <button onclick="updateQty('${i._id}', 1)">+</button>
                </div>
            </div>`).join('');
    } else { cartList.innerHTML = `<div class="text-center py-12 text-xs text-slate-500 font-bold">حقيبة التسوق فارغة</div>`; }
}

async function changeView(viewId, btn) {
    playSound('snd-click');
    document.querySelectorAll('.view-content').forEach(v => v.classList.add('hidden'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(`view-${viewId}`).classList.remove('hidden');
    if(btn) btn.classList.add('active');
    
    if(viewId === 'orders') await loadOrders();
    if(viewId === 'notifications') await fetchMessages();
    if(viewId === 'home') await fetchAds();
    ui();
}

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

// الدوال المساعدة (Toast, Close, Audio...)
function toast(m) { const t = document.getElementById('toast'); t.innerText = m; t.classList.remove('hidden'); setTimeout(() => t.classList.add('hidden'), 3500); }
function playSound(id) { const s = document.getElementById(id); if(s) { s.currentTime = 0; s.play().catch(e=>{}); } }
function logout() { localStorage.clear(); location.reload(); }
function closeSheet() { document.getElementById('product-sheet').style.bottom = "-100%"; setTimeout(() => document.getElementById('sheet-overlay').classList.add('hidden'), 500); }

// (يتم تضمين بقية دوال الألعاب والمنتجات من الكود السابق هنا لضمان عملها)
async function fetchMessages() { /* كود الرسائل */ }
async function fetchGames() { /* كود الألعاب */ }
async function initProducts() { /* كود المنتجات */ }

window.onload = () => { if (state.user) unlockApp(); else { document.getElementById('splash').classList.add('hidden'); document.getElementById('auth-screen').classList.remove('hidden'); } };
setInterval(() => { if(state.user) sync(); }, 20000);
