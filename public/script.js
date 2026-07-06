const API = window.location.origin;

let state = {
    prods: [],
    cart: [],
    user: JSON.parse(localStorage.getItem('wasl_user_v1')) || null,
    games: [],
    selectedGame: null,
    selectedDenom: null
};

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
    await fetchAds();
    await fetchGames();
    await fetchMessages();
    await fetchOrders();
}

function showToast(txt) {
    const t = document.getElementById('toast');
    t.innerText = txt; t.classList.remove('hidden');
    playSound('snd-notification');
    setTimeout(() => t.classList.add('hidden'), 3500);
}

function playSound(id) {
    const s = document.getElementById(id);
    if(s) { s.currentTime = 0; s.play().catch(e=>{}); }
}

function toggleAuthMode() {
    const container = document.getElementById('signup-name-container');
    const title = document.getElementById('auth-title');
    container.classList.toggle('hidden');
    title.innerText = container.classList.contains('hidden') ? "تسجيل الدخول" : "إنشاء حساب";
}

async function handleAuthSubmit() {
    const isSignup = !document.getElementById('signup-name-container').classList.contains('hidden');
    const name = document.getElementById('auth-name').value;
    const phone = document.getElementById('auth-phone').value;
    const pass = document.getElementById('auth-pass').value;

    if(!phone || !pass || (isSignup && !name)) return showToast("الرجاء ملء كل الحقول المطلوبة");

    const path = isSignup ? '/api/auth/signup' : '/api/auth/login';
    const body = isSignup ? { name, phone, pass } : { phone, pass };

    try {
        let res = await fetch(`${API}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        let data = await res.json();
        if(res.ok && data.success) {
            state.user = data.user;
            localStorage.setItem('wasl_user_v1', JSON.stringify(data.user));
            unlockApp();
        } else { showToast(data.message || "حدث خطأ في العملية"); }
    } catch(e) { showToast("فشل الاتصال بالسيرفر السحابي"); }
}

function changeView(viewId, btn) {
    document.querySelectorAll('.view-content').forEach(v => v.classList.add('hidden'));
    document.getElementById(`view-${viewId}`).classList.remove('hidden');
    
    // في حال الانتقال لواجهة غير المنتجات، تضمن عودة شاشة المنتجات لوضعها الطبيعي
    if(viewId !== 'products' && viewId !== 'home') {
        document.getElementById('view-products').classList.add('hidden');
    }

    document.querySelectorAll('.nav-item').forEach(b => { b.classList.remove('text-[#ffcc00]'); b.classList.add('text-gray-500'); });
    if(btn) { btn.classList.remove('text-gray-500'); btn.classList.add('text-[#ffcc00]'); }
    playSound('snd-click');
}

// 🧭 دالة التوجيه الذكي من صفحة الخدمات إلى الشاشة الرئيسية لعرض المتجر
function redirectToStore(vendorKey, vendorName) {
    const homeBtn = document.querySelector("nav button[onclick*='home']");
    document.querySelectorAll('.nav-item').forEach(b => { 
        b.classList.remove('text-[#ffcc00]'); 
        b.classList.add('text-gray-500'); 
    });
    if(homeBtn) { 
        homeBtn.classList.remove('text-gray-500'); 
        homeBtn.classList.add('text-[#ffcc00]'); 
    }
    openVendorStore(vendorKey, vendorName);
}

// فتح متجر معين وسحب منتجات البائع المحددة
async function openVendorStore(vendorKey, vendorName) {
    document.getElementById('cat-title-display').innerText = vendorName;
    const list = document.getElementById('products-list');
    list.innerHTML = `<div class="text-center py-12 text-xs text-gray-500 animate-pulse">جاري سحب عروض المتجر عبر واصل...</div>`;
    
    // إخفاء الواجهات الأخرى والتركيز على واجهة المنتجات
    document.querySelectorAll('.view-content').forEach(v => v.classList.add('hidden'));
    document.getElementById('view-products').classList.remove('hidden');

    try {
        let res = await fetch(`${API}/api/products/vendor/${vendorKey}`);
        state.prods = await res.json();
        
        if(state.prods.length > 0) {
            list.innerHTML = state.prods.map(p => `
                <div onclick="openProductSheet('${p._id}')" class="p-4 bg-[#0d0f11] rounded-3xl border border-white/5 flex gap-4 items-center cursor-pointer active:scale-95 transition">
                    <img src="${p.img || 'https://via.placeholder.com/150'}" class="w-16 h-16 object-cover rounded-2xl">
                    <div class="flex-1">
                        <h3 class="font-black text-xs text-white">${p.name}</h3>
                        <p class="text-[10px] text-gray-500 mt-0.5">المتجر: ${vendorName}</p>
                        <p class="text-xs text-[#ffcc00] font-bold mt-1">${Number(p.price).toLocaleString()} YER</p>
                    </div>
                    <i class="fas fa-plus text-xs text-[#ffcc00] bg-[#ffcc00]/5 p-3 rounded-xl border border-[#ffcc00]/10"></i>
                </div>
            `).join('');
        } else {
            list.innerHTML = `<div class="text-center py-12 text-xs font-bold text-gray-600">لا توجد أي منتجات في هذا المتجر حالياً</div>`;
        }
    } catch (e) { list.innerHTML = `<div class="text-center py-12 text-xs text-red-500">فشل تحميل المتجر</div>`; }
    
    playSound('snd-click');
}

function goBackToHome() {
    document.getElementById('view-products').classList.add('hidden');
    document.getElementById('view-home').classList.remove('hidden');
    playSound('snd-click');
}

function openProductSheet(id) {
    const p = state.prods.find(x => x._id === id);
    if(!p) return;
    document.getElementById('sh-img').src = p.img || 'https://via.placeholder.com/150';
    document.getElementById('sh-name').innerText = p.name;
    document.getElementById('sh-price').innerText = Number(p.price).toLocaleString() + " YER";
    document.getElementById('sh-add-btn').onclick = () => { addToCart(p); closeSheet(); };
    document.getElementById('sheet-overlay').classList.remove('hidden');
    setTimeout(() => document.getElementById('product-sheet').style.bottom = "0", 10);
}

function closeSheet() {
    document.getElementById('product-sheet').style.bottom = "-100%";
    setTimeout(() => document.getElementById('sheet-overlay').classList.add('hidden'), 400);
}

function addToCart(p) {
    const exist = state.cart.find(x => x._id === p._id);
    if(exist) exist.qty += 1;
    else state.cart.push({ ...p, qty: 1 });
    showToast(`تمت إضافة ${p.name} لحقيبة واصل`);
    ui();
}

function updateQty(id, change) {
    const item = state.cart.find(x => x._id === id);
    if(!item) return;
    item.qty += change;
    if(item.qty <= 0) state.cart = state.cart.filter(x => x._id !== id);
    ui();
}

async function submitFinalOrder() {
    if(state.cart.length === 0) return showToast("الحقيبة فارغة تماماً");
    const itemsTotal = state.cart.reduce((s, i) => s + (i.price * i.qty), 0);
    
    try {
        let res = await fetch(`${API}/api/orders/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: state.user.phone, order: { items: state.cart, total: itemsTotal } })
        });
        let data = await res.json();
        if(res.ok && data.success) {
            state.cart = [];
            state.user.bal = data.currentBal;
            localStorage.setItem('wasl_user_v1', JSON.stringify(state.user));
            playSound('snd-cashier');
            showToast("تم خصم القيمة وجاري تحريك خدمة واصل للتوصيل 🚚");
            ui();
            await fetchOrders();
            changeView('orders');
        } else { showToast(data.message || "فشلت العملية"); }
    } catch(e) { showToast("حدث خطأ أثناء إرسال الطلب"); }
}

async function fetchAds() {
    try {
        let res = await fetch(`${API}/api/ads`);
        let ads = await res.json();
        if(ads.length > 0) {
            document.getElementById('ad-container').classList.remove('hidden');
            document.getElementById('ad-frame').src = ads[0].videoUrl;
        }
    } catch(e){}
}

async function fetchGames() {
    try {
        let res = await fetch(`${API}/api/games`);
        state.games = await res.json();
        document.getElementById('games-grid').innerHTML = state.games.map(g => `
            <div onclick="selectGame('${g._id}')" class="p-4 bg-[#0d0f11] border border-white/5 rounded-2xl text-center cursor-pointer">
                <img src="${g.img}" class="w-10 h-10 mx-auto rounded-xl object-cover mb-2">
                <h4 class="text-[10px] font-black">${g.title}</h4>
            </div>`).join('');
    } catch(e){}
}

function selectGame(id) {
    const g = state.games.find(x => x._id === id);
    state.selectedGame = g;
    document.getElementById('denom-title').innerText = `باقات وفئات: ${g.title}`;
    document.getElementById('denoms-list').innerHTML = g.denoms.map((d, index) => `
        <button onclick="selectDenom(${index}, this)" class="p-3 bg-white/5 border border-white/5 rounded-xl text-xs font-bold transition">${d.name} (${d.price} YER)</button>
    `).join('');
    document.getElementById('denom-box').classList.remove('hidden');
}

function selectDenom(idx, btn) {
    state.selectedDenom = state.selectedGame.denoms[idx];
    document.querySelectorAll('#denoms-list button').forEach(b => b.classList.remove('border-[#ffcc00]', 'bg-[#ffcc00]/5'));
    btn.classList.add('border-[#ffcc00]', 'bg-[#ffcc00]/5');
}

async function processApiRecharge() {
    const target = document.getElementById('recharge-target').value;
    if(!state.selectedDenom || !target) return showToast("يرجى اختيار الفئة وإدخال رقم الحساب");
    
    try {
        let res = await fetch(`${API}/api/recharge/pay`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: state.user.phone, price: state.selectedDenom.price, details: `${state.selectedGame.title} - ${state.selectedDenom.name} للرقم ${target}` })
        });
        let data = await res.json();
        if(res.ok && data.success) {
            state.user.bal = data.currentBal;
            localStorage.setItem('wasl_user_v1', JSON.stringify(state.user));
            showToast("تم الشحن والتسديد الفوري تلقائياً عبر الـ API ✅");
            document.getElementById('denom-box').classList.add('hidden');
            ui();
            await fetchOrders();
        } else { showToast(data.message || "رصيدك غير كافٍ"); }
    } catch(e){ showToast("فشلت عملية الربط والاتصال"); }
}

async function fetchOrders() {
    if(!state.user) return;
    try {
        let res = await fetch(`${API}/api/orders/${state.user.phone}`);
        let orders = await res.json();
        document.getElementById('orders-list').innerHTML = orders.reverse().map(o => `
            <div class="p-4 bg-[#0d0f11] border border-white/5 rounded-2xl space-y-2">
                <div class="flex justify-between items-center text-xs">
                    <span class="font-black text-[#ffcc00]">${o.id}</span>
                    <span class="text-gray-500 text-[10px]">${o.date}</span>
                </div>
                <div class="text-xs text-gray-300">${o.items.map(i => `${i.name} (x${i.qty || 1})`).join('، ')}</div>
                <div class="flex justify-between items-center pt-2 border-t border-white/5 text-xs">
                    <span class="text-[10px] px-3 py-1 bg-white/5 rounded-lg font-black text-amber-400">${o.status}</span>
                    <span class="font-bold text-white">${Number(o.total).toLocaleString()} YER</span>
                </div>
            </div>`).join('');
    } catch(e){}
}

async function fetchMessages() {
    if(!state.user) return;
    try {
        let res = await fetch(`${API}/api/messages/${state.user.phone}`);
        let msgs = await res.json();
        document.getElementById('chat-box').innerHTML = msgs.map(m => `
            <div class="flex ${m.isAdmin ? 'justify-start' : 'justify-end'}">
                <div class="p-3 max-w-[80%] rounded-2xl text-xs font-bold ${m.isAdmin ? 'bg-amber-500/10 text-amber-400 rounded-tr-none' : 'bg-[#ffcc00] text-black rounded-tl-none'}">
                    <p>${m.text}</p>
                    <span class="text-[8px] opacity-50 block mt-1 text-left">${m.date.split(',')[1] || ''}</span>
                </div>
            </div>`).join('');
        const c = document.getElementById('chat-box'); c.scrollTop = c.scrollHeight;
    } catch(e){}
}

async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    if(!input.value.trim() || !state.user) return;
    
    try {
        let res = await fetch(`${API}/api/messages/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: state.user.phone, text: input.value, isAdmin: false })
        });
        if(res.ok) { input.value = ''; await fetchMessages(); }
    } catch(e){}
}

function logout() {
    localStorage.removeItem('wasl_user_v1');
    location.reload();
}

function ui() {
    if(!state.user) return;
    document.getElementById('u-balance-top').innerText = Number(state.user.bal).toLocaleString() + " YER";
    document.getElementById('acc-name').innerText = state.user.name;
    document.getElementById('acc-phone').innerText = state.user.phone;
    document.getElementById('profile-name').innerText = state.user.name;
    document.getElementById('profile-phone').innerText = state.user.phone;

    const cartList = document.getElementById('cart-list');
    const itemsTotal = state.cart.reduce((s, i) => s + (i.price * i.qty), 0);
    const deliveryFee = state.cart.length > 0 ? 1000 : 0; 
    const finalTotal = itemsTotal + deliveryFee;
    
    document.getElementById('cart-total').innerText = finalTotal.toLocaleString() + " YER";
    
    if(state.cart.length > 0) {
        cartList.innerHTML = `
            <div class="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl text-[10px] text-amber-400 flex justify-between items-center mb-1">
                <span>🚚 خدمة كابتن التوصيل الآلي: <b>واصل</b></span>
                <span>+ 1,000 YER</span>
            </div>
        ` + state.cart.map(i => `
            <div class="p-4 bg-[#0d0f11] rounded-2xl flex justify-between items-center border border-white/5">
                <div>
                    <h4 class="font-bold text-xs text-white">${i.name}</h4>
                    <p class="text-[11px] text-amber-500 mt-1">${(i.price * i.qty).toLocaleString()} YER</p>
                </div>
                <div class="flex items-center gap-3 bg-black/40 px-3 py-1 rounded-xl border border-white/5">
                    <button onclick="updateQty('${i._id}', -1)" class="px-1 text-gray-500 font-bold">-</button>
                    <span class="text-xs font-black">${i.qty}</span>
                    <button onclick="updateQty('${i._id}', 1)" class="px-1 text-[#ffcc00] font-bold">+</button>
                </div>
            </div>`).join('');
    } else { cartList.innerHTML = `<div class="text-center py-12 text-xs text-gray-600 font-bold">حقيبة واصل فارغة تماماً</div>`; }
}

setInterval(async () => {
    if(!state.user) return;
    try {
        let res = await fetch(`${API}/api/auth/user/${state.user.phone}`);
        let data = await res.json();
        if(res.ok && data.success) {
            state.user = data.user;
            localStorage.setItem('wasl_user_v1', JSON.stringify(data.user));
            document.getElementById('u-balance-top').innerText = Number(state.user.bal).toLocaleString() + " YER";
        }
        await fetchMessages();
        await fetchOrders();
    } catch (e) {}
}, 10000);

