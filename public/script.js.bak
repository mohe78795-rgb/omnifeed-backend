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
    } catch(e) { showToast("خطأ أثناء تحميل البيانات المحدثة"); }
}

async function fetchAds() {
    try {
        let res = await fetch(`${API}/api/ads`);
        let ads = await res.json();
        if(ads && ads.length > 0) {
            document.getElementById('ad-wrapper').classList.remove('hidden');
            document.getElementById('ad-iframe').src = ads[0].videoUrl;
        }
    } catch(e){}
}

async function fetchGames() {
    try {
        let res = await fetch(`${API}/api/games`);
        state.games = await res.json();
        renderGames();
    } catch(e){}
}

async function fetchMessages() {
    try {
        let res = await fetch(`${API}/api/messages/${state.user.phone}`);
        let msgs = await res.json();
        renderMessages(msgs);
    } catch(e){}
}

// ================= 3. الحسابات والتوثيق =================
async function handleAuth() {
    const isSignup = !document.getElementById('signup-name-container').classList.contains('hidden');
    const phone = document.getElementById('auth-phone').value.trim();
    const pass = document.getElementById('auth-pass').value.trim();
    const name = document.getElementById('auth-name').value.trim();

    if(!phone || !pass || (isSignup && !name)) return showToast("الرجاء ملء الحقول المطلوبة واضحة");

    const endpoint = isSignup ? '/api/auth/signup' : '/api/auth/login';
    const body = isSignup ? { name, phone, pass } : { phone, pass };

    try {
        let res = await fetch(`${API}${endpoint}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(body)
        });
        let data = await res.json();
        if(res.ok && data.success) {
            state.user = data.user;
            localStorage.setItem('abu_user_v30', JSON.stringify(data.user));
            playSound('snd-cashier');
            unlockApp();
        } else {
            showToast(data.message || "فشلت عملية الدخول");
        }
    } catch(e) { showToast("خطأ غير متوقع بالخادم"); }
}

// ================= 4. بناء وعرض واجهات العميل =================
function ui() {
    if(!state.user) return;
    document.getElementById('user-display-name').innerText = state.user.name;
    document.getElementById('user-display-phone').innerText = state.user.phone;
    document.getElementById('user-display-bal').innerText = Number(state.user.bal).toLocaleString() + " YER";
    
    document.getElementById('acc-name').innerText = state.user.name;
    document.getElementById('acc-phone').innerText = state.user.phone;
    document.getElementById('acc-date').innerText = state.user.joinDate || "مستمر";
    document.getElementById('acc-bal').innerText = Number(state.user.bal).toLocaleString() + " YER";
}

function renderCategories() {
    const box = document.getElementById('categories-scroll');
    box.innerHTML = `<button onclick="filterCategory('ALL')" class="bg-[#ffcc00] text-black font-black px-4 py-2 rounded-xl text-xs whitespace-nowrap">الكل</button>`;
    state.categories.forEach(c => {
        box.innerHTML += `
            <button onclick="filterCategory('${c.name}')" class="bg-[#0d0f11] border border-[#1d2127] text-slate-300 font-bold px-4 py-2 rounded-xl text-xs whitespace-nowrap hover:border-[#ffcc00]/40 transition">
                ${c.name}
            </button>
        `;
    });
    renderProducts();
}

let activeFilter = 'ALL';
function filterCategory(catName) {
    activeFilter = catName;
    renderProducts();
}

function changeLayout(mode) {
    state.layoutMode = mode;
    document.querySelectorAll('.modern-switch-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`layout-btn-${mode}`).classList.add('active');
    renderProducts();
}

function renderProducts() {
    const box = document.getElementById('products-grid');
    const q = document.getElementById('shop-search').value.toLowerCase();
    
    let list = state.prods;
    if(activeFilter !== 'ALL') list = list.filter(x => x.cat === activeFilter);
    if(q) list = list.filter(x => x.name.toLowerCase().includes(q));

    box.className = "grid gap-3 transition-all duration-300 ";
    if(state.layoutMode === 0) box.classList.add('grid-cols-2');
    else if(state.layoutMode === 1) box.classList.add('grid-cols-3');
    else box.classList.add('grid-cols-1');

    box.innerHTML = '';
    if(list.length === 0) {
        box.innerHTML = `<p class="col-span-full text-center text-xs text-slate-500 py-8">لا توجد سلع متوفرة حالياً</p>`;
        return;
    }

    list.forEach(p => {
        if(state.layoutMode === 2) {
            box.innerHTML += `
                <div onclick="openProductSheet('${p._id}')" class="bg-[#0d0f11] border border-[#1d2127] p-3 rounded-xl flex items-center gap-3 cursor-pointer">
                    <img src="${p.img || 'https://images.unsplash.com/photo-1542838132-92c53300491e'}" class="w-12 h-12 object-cover rounded-lg">
                    <div class="flex-1">
                        <h4 class="text-xs font-black text-white">${p.name}</h4>
                        <span class="text-[11px] text-[#ffcc00] font-black">${Number(p.price).toLocaleString()} YER</span>
                    </div>
                    <i class="fas fa-cart-plus text-slate-500 text-sm"></i>
                </div>
            `;
        } else {
            box.innerHTML += `
                <div onclick="openProductSheet('${p._id}')" class="bg-[#0d0f11] border border-[#1d2127] p-3 rounded-2xl space-y-2 cursor-pointer flex flex-col justify-between">
                    <img src="${p.img || 'https://images.unsplash.com/photo-1542838132-92c53300491e'}" class="w-full aspect-square object-cover rounded-xl">
                    <div>
                        <h4 class="text-xs font-black text-white line-clamp-1">${p.name}</h4>
                        <div class="flex items-center justify-between pt-1">
                            <span class="text-[11px] text-[#ffcc00] font-black">${Number(p.price).toLocaleString()} YER</span>
                            <div class="w-6 h-6 bg-[#ffcc00]/10 text-[#ffcc00] rounded-lg flex items-center justify-center text-[10px]"><i class="fas fa-plus"></i></div>
                        </div>
                    </div>
                </div>
            `;
        }
    });
}

// ================= 5. نظام شحن الألعاب =================
function renderGames() {
    const box = document.getElementById('games-list-container');
    box.innerHTML = '';
    state.games.forEach(g => {
        box.innerHTML += `
            <div onclick="selectGame('${g._id}')" class="bg-[#0d0f11] border border-[#1d2127] p-3 rounded-2xl text-center space-y-2 cursor-pointer hover:border-[#ffcc00]/40 transition">
                <img src="${g.img}" class="w-12 h-12 rounded-full mx-auto object-cover border border-[#1d2127]">
                <h4 class="text-xs font-black text-white">${g.title}</h4>
            </div>
        `;
    });
}

function selectGame(id) {
    const g = state.games.find(x => x._id === id);
    state.selectedGame = g;
    state.selectedDenom = null;
    
    document.getElementById('target-game-title').innerText = `باقات الشحن لـ ${g.title}`;
    document.getElementById('player-validation-name').classList.add('hidden');
    document.getElementById('game-player-id').value = '';
    
    const dBox = document.getElementById('game-denoms-container');
    dBox.innerHTML = '';
    g.denoms.forEach((d, idx) => {
        dBox.innerHTML += `
            <div onclick="selectDenom(${idx}, this)" class="denom-row bg-black/40 border border-[#1d2127] p-3 rounded-xl flex justify-between items-center cursor-pointer text-xs transition">
                <span class="font-bold text-white">${d.name}</span>
                <span class="font-black text-[#ffcc00]">${Number(d.price).toLocaleString()} YER</span>
            </div>
        `;
    });
    document.getElementById('game-direct-panel').classList.remove('hidden');
}

function selectDenom(idx, el) {
    state.selectedDenom = state.selectedGame.denoms[idx];
    document.querySelectorAll('.denom-row').forEach(r => r.classList.remove('border-[#ffcc00]', 'bg-[#ffcc00]/5'));
    el.classList.add('border-[#ffcc00]', 'bg-[#ffcc00]/5');
}

async function validatePlayer() {
    const pid = document.getElementById('game-player-id').value.trim();
    if(!state.selectedGame || !pid) return showToast("أدخل معرّف ID صالح أولاً");
    try {
        let res = await fetch(`${API}/api/games/validate?gameId=${state.selectedGame._id}&playerId=${pid}`);
        let data = await res.json();
        const lbl = document.getElementById('player-validation-name');
        if(res.ok && data.success) {
            lbl.innerText = `👤 العميل: ${data.name}`;
            lbl.classList.remove('hidden');
        } else {
            lbl.innerText = "❌ تعذر العثور على الـ ID أو اللعبة غير مدعومة حالياً";
            lbl.classList.remove('hidden');
        }
    } catch(e){}
}

async function submitGameOrder() {
    const pid = document.getElementById('game-player-id').value.trim();
    if(!state.selectedGame || !state.selectedDenom || !pid) return showToast("الرجاء استكمال بيانات الشحن والمعرّف");
    
    if(Number(state.user.bal) < Number(state.selectedDenom.price)) return showToast("رصيد محفظتك غير كافٍ لإتمام عملية الشحن");

    try {
        let res = await fetch(`${API}/api/orders/game`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                phone: state.user.phone,
                gameId: state.selectedGame._id,
                denomName: state.selectedDenom.name,
                price: state.selectedDenom.price,
                playerId: pid
            })
        });
        let data = await res.json();
        if(res.ok && data.success) {
            playSound('snd-cashier');
            showToast("✅ تم الشحن بنجاح! خصم المبلغ من رصيدك");
            await sync();
            document.getElementById('game-direct-panel').classList.add('hidden');
        } else {
            showToast(data.message || "فشلت عملية الشحن");
        }
    } catch(e){}
}

// ================= 6. سلة السلع والعمليات المباشرة =================
function addToCart(p) {
    state.cart.push(p);
    playSound('snd-click');
    showToast(`🛒 تمت إضافة ${p.name} إلى السلة`);
    renderCart();
}

function removeFromCart(idx) {
    state.cart.splice(idx, 1);
    renderCart();
}

function clearCart() {
    state.cart = [];
    renderCart();
}

function renderCart() {
    const box = document.getElementById('cart-items-list');
    const cCount = document.getElementById('cart-count');
    box.innerHTML = '';
    
    if(state.cart.length === 0) {
        box.innerHTML = `<p class="text-center text-xs text-slate-500 py-6">سلتك فارغة، أضف بعض السلع</p>`;
        cCount.classList.add('hidden');
        document.getElementById('cart-total-price').innerText = "0 YER";
        document.getElementById('cart-net-price').innerText = "0 YER";
        return;
    }

    cCount.innerText = state.cart.length;
    cCount.classList.remove('hidden');

    let total = 0;
    state.cart.forEach((p, idx) => {
        total += Number(p.price);
        box.innerHTML += `
            <div class="bg-[#0d0f11] border border-[#1d2127] p-3 rounded-xl flex justify-between items-center text-xs">
                <div>
                    <h4 class="font-black text-white">${p.name}</h4>
                    <span class="text-[#ffcc00] font-black">${Number(p.price).toLocaleString()} YER</span>
                </div>
                <button onclick="removeFromCart(${idx})" class="text-red-400 p-2"><i class="fas fa-minus-circle"></i></button>
            </div>
        `;
    });

    document.getElementById('cart-total-price').innerText = total.toLocaleString() + " YER";
    document.getElementById('cart-net-price').innerText = total.toLocaleString() + " YER";
}

async function checkoutOrder() {
    if(state.cart.length === 0) return showToast("السلة فارغة حالياً");
    let total = state.cart.reduce((a, b) => a + Number(b.price), 0);
    if(Number(state.user.bal) < total) return showToast("عذراً، رصيد محفظتك غير كافٍ لإتمام عملية الشراء");

    const textList = state.cart.map(x => `- ${x.name} (${x.price} YER)`).join('\n');
    const msg = `طلب جديد من: ${state.user.name}\nالهاتف: ${state.user.phone}\n\nالسلع:\n${textList}\n\nالإجمالي: ${total} YER`;

    try {
        let res = await fetch(`${API}/api/orders/shop`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                phone: state.user.phone,
                items: state.cart.map(x => ({ name: x.name, price: x.price })),
                total
            })
        });
        let data = await res.json();
        if(res.ok && data.success) {
            playSound('snd-cashier');
            window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
            clearCart();
            showToast("✅ تم تسجيل طلبك وخصمه من محفظتك المباشرة بنجاح");
            await sync();
        } else {
            showToast(data.message || "تعذر معالجة الطلب حالياً");
        }
    } catch(e){}
}

// ================= 7. صندوق الرسائل والإشعارات والشات =================
function renderMessages(msgs) {
    const box = document.getElementById('messages-container');
    const dot = document.getElementById('msg-dot');
    box.innerHTML = '';
    if(!msgs || msgs.length === 0) {
        box.innerHTML = `<p class="text-center text-xs text-slate-500 py-6">ليس لديك أي إشعارات إدارية جديدة</p>`;
        dot.classList.add('hidden');
        return;
    }
    dot.classList.remove('hidden');
    msgs.reverse().forEach(m => {
        box.innerHTML += `
            <div class="bg-[#0d0f11] border border-[#1d2127] p-4 rounded-xl space-y-1">
                <div class="flex justify-between items-center">
                    <h4 class="font-black text-xs text-[#ffcc00]">${m.title}</h4>
                    <span class="text-[9px] text-slate-500">${m.date || ''}</span>
                </div>
                <p class="text-xs text-slate-300 leading-relaxed">${m.body}</p>
            </div>
        `;
    });
}

// ================= 8. المساعدات وأدوات الـ UI الفرعية =================
function changeView(viewId, btnEl) {
    // إخفاء جميع الشاشات أولاً
    document.querySelectorAll('.view-panel').forEach(v => v.classList.add('hidden'));
    
    // إزالة اللون الذهبي النشط والتوهج من كافة أزرار القائمة السفلية
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        item.style.textShadow = 'none';
    });

    // إظهار الشاشة المحددة التي طلبها العميل
    const targetView = document.getElementById(`view-${viewId}`);
    if (targetView) targetView.classList.remove('hidden');

    // تفعيل التوهج الذهبي الفخم على الزر الذي تم النقر عليه حالياً
    if (btnEl) {
        btnEl.classList.add('active');
    }

    // تشغيل تأثير صوت النقرة الفاخر لتجربة مستخدم متكاملة
    playSound('snd-click');
}

function showToast(m) {
    const t = document.getElementById('toast');
    t.innerText = m; t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 4000);
}

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
        if(res.ok && data.success) { 
            state.user = data.user;
            localStorage.setItem('abu_user_v30', JSON.stringify(data.user));
            ui();
        }
    } catch(e){}
}
