// منظومة أبو حسين الرقمية الذكية v4.0 - الجرافيكس المنبهر
const API = window.location.origin; 
const WHATSAPP_NUMBER = "+967773030310"; // تم تحديث الرقم بناءً على الهيدر

let state = {
    categories: [],
    prods: [],
    cart: [],
    layoutMode: 0, // 0: dual, 1: matrix, 2: list
    user: JSON.parse(localStorage.getItem('abu_user_v40')) || null, // تحديث نسخة الخزن
    games: [],
    selectedGame: null,
    selectedDenom: null
};

// ================= 1. البداية والتشغيل =================
window.onload = () => {
    // محاكاة تحميل المنظومة (Splash)
    setTimeout(() => {
        if (state.user) unlockApp();
        else {
            document.getElementById('splash').classList.add('hidden');
            document.getElementById('auth-screen').classList.remove('hidden');
        }
    }, 2500); // زيادة الوقت قليلاً لإظهار اللودر الجديد
};

async function unlockApp() {
    document.getElementById('splash').classList.add('hidden');
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-layout').classList.remove('hidden');
    
    // إضافة انيميشن خفيف للخلفية الزجاجية عند الدخول
    document.querySelector('.glass-background').style.opacity = '1';

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
                <div onclick="selectGame('${g.game_code}')" class="p-5 glassmorphism-light rounded-3xl border border-white/5 flex justify-between items-center cursor-pointer active:scale-[0.98] transition-all hover:border-emerald-500/20">
                    <div class="flex items-center gap-4">
                        <div class="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 text-2xl shadow-inner-pop">
                            <i class="fas fa-gamepad"></i>
                        </div>
                        <div>
                            <h3 class="font-black text-white text-base tracking-tight">${g.game_name}</h3>
                            <p class="text-[10px] px-2 py-0.5 inline-block rounded-full bg-emerald-500/10 text-emerald-400 font-bold mt-1">شحن مباشر تلقائي ⚡</p>
                        </div>
                    </div>
                    <i class="fas fa-chevron-left text-xs text-slate-600 ml-2"></i>
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
                <div class="p-6 glassmorphism-light rounded-3xl border border-white/5 animate-fadeIn">
                    <div class="flex justify-between items-start mb-3">
                        <span class="text-[10px] text-emerald-300 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/10">${m.date}</span>
                        <i class="fas fa-envelope-open text-emerald-500 opacity-30 text-lg"></i>
                    </div>
                    <h3 class="text-base font-black text-white mb-1.5tracking-tight">${m.title}</h3>
                    <p class="text-[12px] text-slate-400 leading-relaxed">${m.body}</p>
                </div>
            `).join('');
        } else {
            document.getElementById('msg-dot').classList.add('hidden');
            list.innerHTML = `<div class="opacity-30 text-center py-20 text-xs font-bold text-slate-500">لا توجد رسائل جديدة</div>`;
        }
    } catch(e) { console.log("Msg Error"); }
}

// ================= 3. عرض المنتجات والتحكم بالشبكة =================
function renderCategories() {
    const list = document.getElementById('categories-list');
    if(!list) return;
    list.innerHTML = state.categories.map(c => `
        <div onclick="openCategory('${c.name}')" class="card-glass animate-fadeIn group">
            <img src="${c.img}" class="w-full h-32 object-cover rounded-2xl mb-4 shadow-xl border border-white/5">
            <h3 class="font-black text-sm text-white tracking-tight">${c.name}</h3>
            <p class="text-[10px] text-emerald-400 mt-1 font-bold">${c.sub || 'خدمات متميزة'}</p>
            <i class="fas fa-arrow-left absolute bottom-4 left-4 text-xs text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity"></i>
        </div>
    `).join('');
}

function setLayout(mode) {
    const container = document.getElementById('categories-list');
    if(!container) return;
    
    container.classList.remove('mode-matrix', 'mode-dual', 'mode-list');
    document.querySelectorAll('.btn-layout').forEach(b => b.classList.remove('active'));

    const activeBtn = document.getElementById(`btn-layout-${mode}`);
    if(activeBtn) activeBtn.classList.add('active');
    
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
            <div onclick="openProductSheet('${p._id}')" class="p-4 glassmorphism-light rounded-3xl border border-white/5 flex gap-4 items-center cursor-pointer active:scale-[0.99] transition-all hover:border-emerald-500/20">
                <img src="${p.img}" class="w-20 h-20 object-cover rounded-2xl shadow-lg border border-white/5">
                <div class="flex-1">
                    <h3 class="font-black text-sm text-white tracking-tight">${p.name}</h3>
                    <p class="text-xs text-emerald-300 font-bold mt-1 shadow-glow-sm">${Number(p.price).toLocaleString()} YER</p>
                </div>
                <i class="fas fa-plus text-xs text-emerald-500 bg-emerald-500/10 p-3.5 rounded-xl border border-emerald-500/10 active:scale-90 shadow-inner-pop"></i>
            </div>
        `).join('');
    } else {
        list.innerHTML = `<div class="opacity-30 text-center py-16 text-xs font-bold text-slate-500">لا توجد منتجات في هذا القسم حالياً</div>`;
    }
    document.getElementById('view-home').classList.add('hidden');
    document.getElementById('view-products').classList.remove('hidden');
    playSound('snd-click');
}

// ================= 4. نظام الموقع والدفع المتعدد =================
function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) { toast("⚠️ الموقع غير مدعوم في جهازك"); reject(); }
        // تعديل الطلب ليكون أكثر حزماً مع الوقت
        navigator.geolocation.getCurrentPosition(
            (p) => resolve({ link: `https://www.google.com/maps?q=${p.coords.latitude},${p.coords.longitude}` }),
            (e) => { 
                alert("❌ يجب تفعيل الـ GPS والسماح للمتجر بالوصول لموقعك لتحديد عنوان التوصيل.");
                reject(e); 
            },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
        );
    });
}

async function processOrder(method) {
    if (state.cart.length === 0) return toast("🛒 حقيبة التسوق فارغة");
    const total = state.cart.reduce((s, i) => s + (i.price * i.qty), 0);
    
    if (method === 'wallet' && state.user.bal < total) {
        playSound('snd-notification');
        return toast("❌ رصيد محفظتك غير كافٍ لإتمام العملية");
    }

    toast("⏳ جاري تحديد موقعك الجغرافي...");
    try {
        const location = await getUserLocation();
        if (method === 'whatsapp') {
            let cartStr = state.cart.map(i => `• ${i.name} (x${i.qty})`).join('\n');
            let msg = `*طلب جديد من منظومة أبو حسين*\n\n*العميل:* ${state.user.name}\n*الهاتف:* ${state.user.phone}\n\n*المنتجات:*\n${cartStr}\n\n*الإجمالي:* ${total.toLocaleString()} YER\n\n*الموقع النقاطي:* ${location.link}`;
            window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
            state.cart = []; ui();
            changeView('home', document.querySelector("button[onclick*='home']"));
            toast("✅ تم تحويلك للواتساب لإتمام الطلب");
        } else {
            submitOrderToDB(location, total, method === 'wallet' ? "دفع محفظة" : "دفع عند الاستلام");
        }
    } catch (e) {
        console.log("Location or Order Error", e);
    }
}

async function submitOrderToDB(loc, total, paymentType) {
    toast("⏳ جاري تسجيل طلبك في السيرفر...");
    try {
        let res = await fetch(`${API}/api/orders/add`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ phone: state.user.phone, order: { total, items: state.cart, location: loc.link, paymentMethod: paymentType } })
        });
        if (res.ok) {
            let data = await res.json();
            playSound('snd-cashier');
            toast(`✅ تم تسجيل الطلب بنجاح! شكراً لثقتك`);
            state.cart = [];
            if(paymentType === "دفع محفظة") state.user.bal = data.currentBal;
            localStorage.setItem('abu_user_v40', JSON.stringify(state.user));
            ui();
            changeView('orders', document.querySelector("button[onclick*='orders']"));
        } else {
            toast("❌ فشل في تسلم الطلب، حاول لاحقاً");
        }
    } catch(e) { toast("❌ عطل في الشبكة، تحقق من الاتصال"); }
}

// ================= 5. نظام شحن الألعاب =================
function selectGame(code) {
    const g = state.games.find(x => x.game_code === code);
    state.selectedGame = g;
    document.getElementById('selected-game-title').innerText = g.game_name;
    document.getElementById('game-denoms-list').innerHTML = g.denominations.map(d => `
        <div onclick="pickDenom(this, '${d.id}')" class="denom-card p-5 glassmorphism-light border border-white/5 rounded-2xl text-center cursor-pointer transition-all hover:border-emerald-500/20 active:scale-95">
            <p class="text-xs font-black text-white tracking-tight">${d.name}</p>
            <p class="text-[11px] text-emerald-300 mt-1 font-bold shadow-glow-sm">${d.price.toLocaleString()} YER</p>
        </div>
    `).join('');
    document.getElementById('game-topup-panel').classList.remove('hidden');
    // إضافة حركية ناعمة للتمرير
    setTimeout(() => {
        document.getElementById('game-topup-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

function pickDenom(el, id) {
    // إزالة التحديد السابق
    document.querySelectorAll('.denom-card').forEach(c => {
        c.classList.remove('border-emerald-500', 'bg-emerald-500/10', 'shadow-glow-sm');
        c.classList.add('border-white/5', 'glassmorphism-light');
    });
    // إضافة التحديد الجديد
    el.classList.remove('border-white/5', 'glassmorphism-light');
    el.classList.add('border-emerald-500', 'bg-emerald-500/10', 'shadow-glow-sm');
    
    state.selectedDenom = state.selectedGame.denominations.find(x => x.id === id);
    playSound('snd-click');
}

async function validatePlayer() {
    const id = document.getElementById('game-player-id').value;
    if(!id) return toast("⚠️ الرجاء إدخال ID اللاعب أولاً");
    // محاكاة طلب التحقق
    toast("⏳ جاري التحقق من معرف اللاعب...");
    setTimeout(async () => {
        let res = await fetch(`${API}/api/games/validate-user`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ game_code: state.selectedGame.game_code, user_id: id })
        });
        let data = await res.json();
        if(data.success) {
            const d = document.getElementById('player-name-display');
            d.innerHTML = `<i class="fas fa-user-circle mr-2"></i> اسم اللاعب: <span class="text-white">${data.player_name}</span>`;
            d.classList.remove('hidden');
            playSound('snd-notification');
        } else {
            toast("❌ لم يتم العثور على اللاعب، تحقق من الـ ID");
        }
    }, 1000);
}

async function processGameTopup() {
    const id = document.getElementById('game-player-id').value;
    if(!id || !state.selectedDenom) return toast("⚠️ أكمل البيانات (ID وفئة الشحن)");
    if(state.user.bal < state.selectedDenom.price) {
        playSound('snd-notification');
        return toast("❌ رصيدك الحالي لا يكفي للشحن");
    }
    
    if(!confirm(`هل أنت متأكد من شحن ${state.selectedDenom.name} للحساب ${id}؟`)) return;

    toast("⚡ جاري تنفيذ عملية الشحن الفوري...");
    let res = await fetch(`${API}/api/games/topup`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ phone: state.user.phone, game_code: state.selectedGame.game_code, user_id: id, denomination_id: state.selectedDenom.id, price: state.selectedDenom.price })
    });
    let data = await res.json();
    if(data.success) {
        playSound('snd-cashier');
        toast("✅ تم الشحن بنجاح! راجع حسابك في اللعبة");
        state.user.bal = data.currentBal;
        localStorage.setItem('abu_user_v40', JSON.stringify(state.user));
        ui();
        document.getElementById('game-topup-panel').classList.add('hidden');
        document.getElementById('game-player-id').value = '';
        document.getElementById('player-name-display').classList.add('hidden');
    } else { toast("❌ " + data.message); }
}

// ================= 6. الفواتير والعمليات =================
async function loadOrders() {
    const list = document.getElementById('orders-list');
    if(!list) return;
    list.innerHTML = `<div class="text-center py-10 opacity-50 text-xs">جاري تحميل الفواتير...</div>`;
    try {
        let res = await fetch(`${API}/api/orders/${state.user.phone}`);
        let orders = await res.json();
        list.innerHTML = orders.length > 0 ? orders.map(o => `
            <div class="p-6 glassmorphism-light rounded-3xl border border-white/5 space-y-3.5 animate-fadeIn">
                <div class="flex justify-between items-center">
                    <span class="text-xs font-black text-emerald-300 font-mono bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/10">${o.id || 'فاتورة'}</span>
                    <span class="text-[10px] px-3 py-1.5 glassmorphism-medium rounded-xl border border-white/5 text-slate-300 font-bold">${o.status}</span>
                </div>
                <div class="text-xs text-slate-400 leading-relaxed bg-black/20 p-4 rounded-xl border border-white/5">${o.items.map(i => `• ${i.name} <span class="text-white font-bold">(x${i.qty})</span>`).join('<br>')}</div>
                <div class="flex justify-between items-center border-t border-white/5 pt-3.5">
                    <span class="text-[10px] text-slate-500 font-bold">${o.date}</span>
                    <span class="text-base font-black text-emerald-300 shadow-glow-sm">${o.total.toLocaleString()} YER</span>
                </div>
            </div>`).join('') : `<div class="text-center py-20 text-xs text-slate-600 font-bold glassmorphism-light rounded-2xl border border-white/5">لا توجد عمليات سابقة في سجلّك</div>`;
    } catch (e) { list.innerHTML = "خطأ في جلب البيانات"; }
}

// ================= 7. الوظائف العامة والـ UI =================
function ui() {
    if(!state.user) return;
    // تحديث الهيدر
    document.getElementById('u-balance-top').innerText = Number(state.user.bal).toLocaleString() + " YER";
    document.getElementById('u-avatar').innerText = state.user.name.charAt(0);
    
    // تحديث الشاشات الأخرى
    const accName = document.getElementById('acc-name');
    if(accName) accName.innerText = state.user.name;
    const accPhone = document.getElementById('acc-phone');
    if(accPhone) accPhone.innerText = state.user.phone;
    const accAvatar = document.getElementById('acc-avatar-large');
    if(accAvatar) accAvatar.innerText = state.user.name.charAt(0);
    const accDate = document.getElementById('acc-date');
    if(accDate) accDate.innerText = state.user.joinDate || "مستمر";

    const cartList = document.getElementById('cart-list');
    if(cartList) {
        const total = state.cart.reduce((s, i) => s + (i.price * i.qty), 0);
        document.getElementById('cart-total').innerText = total.toLocaleString() + " YER";
        
        // تحديث بادج السلة في النبار
        const badge = document.getElementById('cart-badge');
        if(state.cart.length > 0) {
            badge.innerText = state.cart.length;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }

        if(state.cart.length > 0) {
            cartList.innerHTML = state.cart.map(i => `
                <div class="p-4.5 glassmorphism-light rounded-2xl flex justify-between items-center border border-white/5 animate-fadeIn">
                    <div>
                        <h4 class="font-bold text-sm text-white tracking-tight">${i.name}</h4>
                        <p class="text-xs text-emerald-300 mt-1 font-bold shadow-glow-sm">${(i.price * i.qty).toLocaleString()} YER</p>
                    </div>
                    <div class="flex items-center gap-3 bg-black/40 px-3.5 py-2 rounded-xl border border-white/5 shadow-inner-pop">
                        <button onclick="updateQty('${i._id}', -1)" class="px-2 text-slate-500 active:text-white">-</button>
                        <span class="text-xs font-black text-white w-4 text-center font-mono">${i.qty}</span>
                        <button onclick="updateQty('${i._id}', 1)" class="px-2 text-emerald-400 active:scale-110">+</button>
                    </div>
                </div>`).join('');
        } else { cartList.innerHTML = `<div class="text-center py-16 text-xs text-slate-600 font-bold glassmorphism-light rounded-2xl border border-white/5">حقيبة التسوق فارغة، ابدأ التسوق الآن</div>`; }
    }
}

async function handleAuth() {
    const isSignup = !document.getElementById('signup-name-container').classList.contains('hidden');
    const name = document.getElementById('auth-name').value;
    const phone = document.getElementById('auth-phone').value;
    const pass = document.getElementById('auth-pass').value;

    if(!phone || !pass || (isSignup && !name)) return toast("⚠️ الرجاء ملء كافة الحقول المطلوبة");
    if(phone.length < 9) return toast("⚠️ رقم الهاتف غير صحيح");

    let url = isSignup ? `${API}/api/auth/signup` : `${API}/api/auth/login`;
    
    toast("⏳ جاري التحقق من البيانات آمنياً...");
    try {
        let res = await fetch(url, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name, phone, pass}) });
        let data = await res.json();
        if(data.success) {
            state.user = data.user;
            localStorage.setItem('abu_user_v40', JSON.stringify(state.user));
            unlockApp();
            playSound('snd-cashier');
        } else { toast("❌ " + data.message); playSound('snd-notification'); }
    } catch(e) { toast("❌ عطل في السيرفر، حاول لاحقاً"); }
}

async function changeView(viewId, btn) {
    playSound('snd-click');
    document.querySelectorAll('.view-content').forEach(v => v.classList.add('hidden'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    const targetView = document.getElementById(`view-${viewId}`);
    if(targetView) {
        targetView.classList.remove('hidden');
        // تأكيد إظهار المحتوى بأنيميشن
        targetView.classList.add('animate-fadeIn');
        setTimeout(() => targetView.classList.remove('animate-fadeIn'), 500);
    }
    
    if(btn) btn.classList.add('active');
    
    // وظائف محددة عند تغيير الشاشة
    if(viewId === 'orders') loadOrders();
    if(viewId === 'notifications') { fetchMessages(); document.getElementById('msg-dot').classList.add('hidden'); }
    if(viewId === 'home') fetchAds();
    if(viewId === 'games') {
        document.getElementById('game-topup-panel').classList.add('hidden');
        document.getElementById('game-player-id').value = '';
    }
    
    ui();
    // إغلاق الشيت إذا كان مفتوحاً
    closeSheet();
    // التمرير لأعلى الشاشة
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// وظائف مساعدة أخرى
function addToCart(p) { 
    let i = state.cart.find(x => x._id === p._id); 
    if(i) i.qty++; 
    else state.cart.push({...p, qty:1}); 
    ui(); 
    toast("🛒 أضيف للسلة بنجاح"); 
    playSound('snd-click');
}

function updateQty(id, delta) { 
    let i = state.cart.find(x => x._id === id); 
    if(i) { 
        i.qty += delta; 
        if(i.qty <= 0) state.cart = state.cart.filter(x => x._id !== id); 
        ui(); 
        playSound('snd-click');
    } 
}

function toast(m) { 
    const t = document.getElementById('toast'); 
    if(!t) return;
    t.innerText = m; 
    t.classList.remove('hidden'); 
    // تفاعل بصري أقوى
    t.style.animation = 'none';
    t.offsetHeight; /* trigger reflow */
    t.style.animation = null; 

    if(window.toastTimeout) clearTimeout(window.toastTimeout);
    window.toastTimeout = setTimeout(() => t.classList.add('hidden'), 4000); 
}

function logout() { 
    if(!confirm("هل أنت متأكد من تسجيل الخروج؟")) return;
    localStorage.removeItem('abu_user_v40'); 
    location.reload(); 
}

function openProductSheet(id) {
    const p = state.prods.find(x => x._id === id);
    if(!p) return;
    document.getElementById('sh-img').src = p.img;
    document.getElementById('sh-name').innerText = p.name;
    document.getElementById('sh-price').innerText = Number(p.price).toLocaleString() + " YER";
    document.getElementById('sh-add-btn').onclick = () => { addToCart(p); closeSheet(); };
    
    const overlay = document.getElementById('sheet-overlay');
    const sheet = document.getElementById('product-sheet');
    
    overlay.classList.remove('hidden');
    setTimeout(() => {
        overlay.style.opacity = '1';
        sheet.style.bottom = "0";
    }, 10);
    playSound('snd-click');
}

function closeSheet() { 
    const overlay = document.getElementById('sheet-overlay');
    const sheet = document.getElementById('product-sheet');
    if(!sheet || sheet.style.bottom === "-100%") return;

    sheet.style.bottom = "-100%"; 
    overlay.style.opacity = '0';
    setTimeout(() => overlay.classList.add('hidden'), 400); 
}

function playSound(id) { 
    const s = document.getElementById(id); 
    if(s) { 
        s.currentTime = 0; 
        s.play().catch(e=>{}); 
    } 
}

function toggleAuthMode() {
    const container = document.getElementById('signup-name-container');
    const title = document.getElementById('auth-title');
    const btn = document.getElementById('auth-btn');
    const toggleBtn = document.getElementById('auth-toggle-btn');
    const toggleText = document.getElementById('auth-toggle-text');
    
    playSound('snd-click');
    
    if(container.classList.contains('hidden')) {
        // التحويل لوضع إنشاء الحساب
        container.classList.remove('hidden');
        container.classList.add('animate-fadeIn');
        title.innerText = "إنشاء حساب جديد";
        btn.innerText = "تأكيد التسجيل الان";
        toggleBtn.innerText = "لديك حساب؟ دخول";
        toggleText.innerText = "";
    } else {
        // التحويل لوضع تسجيل الدخول
        container.classList.add('hidden');
        title.innerText = "دخول آمن";
        btn.innerText = "تسجيل الدخول";
        toggleBtn.innerText = "إنشاء حساب جديد";
        toggleText.innerText = "ليس لديك حساب؟";
    }
}

// وظيفة التحديث اليدوي
function manualRefresh() {
    const btn = document.getElementById('refresh-btn');
    btn.classList.add('rotate-180');
    playSound('snd-click');
    toast("⏳ جاري تحديث البيانات الفوري...");
    
    Promise.all([initProducts(), fetchAds(), fetchGames(), fetchMessages(), sync()])
        .then(() => {
            setTimeout(() => {
                btn.classList.remove('rotate-180');
                toast("✅ تم تحديث كافة البيانات بنجاح");
            }, 1000);
        });
}

// مزامنة الرصيد تلقائياً كل فترة
async function sync() {
    if(!state.user) return;
    try {
        const res = await fetch(`${API}/api/auth/user/${state.user.phone}`);
        const data = await res.json();
        if(res.ok && data.success) { 
            state.user = data.user; 
            localStorage.setItem('abu_user_v40', JSON.stringify(state.user)); 
            ui(); 
        }
    } catch(e) {}
}
// مزامنة كل دقيقة
setInterval(() => { if(state.user) sync(); }, 60000);

