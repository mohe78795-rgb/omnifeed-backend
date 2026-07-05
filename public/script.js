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

// --- ميزات الموقع الجغرافي ---
function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            toast("⚠️ متصفحك لا يدعم تحديد الموقع");
            reject("Not supported");
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    link: `https://www.google.com/maps?q=${position.coords.latitude},${position.coords.longitude}`
                });
            },
            (error) => {
                alert("عذراً، لا يمكن إتمام الطلب بدون تحديد موقعك. يرجى تفعيل GPS من إعدادات جهازك.");
                reject(error);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    });
}

// --- معالجة الطلبات (الميزة الجديدة) ---
async function processOrder(method) {
    if (state.cart.length === 0) return toast("🛒 سلتك فارغة!");
    const total = state.cart.reduce((s, i) => s + (i.price * i.qty), 0);

    if (method === 'wallet' && state.user.bal < total) {
        return toast("❌ رصيد محفظتك غير كافٍ");
    }

    toast("⏳ جاري تحديد موقعك الجغرافي...");
    
    try {
        const location = await getUserLocation();
        
        if (method === 'whatsapp') {
            sendToWhatsApp(location, total);
        } else if (method === 'cod') {
            submitOrderToDB(location, total, "دفع عند الاستلام");
        } else {
            submitOrderToDB(location, total, "دفع محفظة");
        }
    } catch (err) {
        console.error("Location error", err);
    }
}

function sendToWhatsApp(loc, total) {
    let message = `*طلب جديد من متجر أبو حسين*%0A%0A`;
    message += `*العميل:* ${state.user.name}%0A`;
    message += `*الهاتف:* ${state.user.phone}%0A%0A`;
    message += `*الطلبات:*%0A`;
    state.cart.forEach(i => { message += `- ${i.name} (عدد ${i.qty})%0A`; });
    message += `%0A*الإجمالي:* ${total.toLocaleString()} YER%0A`;
    message += `%0A*الموقع:*%0A${loc.link}`;

    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank');
    state.cart = [];
    ui();
    toast("✅ تم تحويلك للواتساب");
}

async function submitOrderToDB(loc, total, paymentType) {
    toast("⏳ جاري إرسال الطلب...");
    try {
        let res = await fetch(`${API}/api/orders/add`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                phone: state.user.phone, 
                order: { 
                    total, 
                    items: state.cart,
                    location: loc.link,
                    paymentMethod: paymentType
                } 
            })
        });
        
        if (res.ok) {
            let data = await res.json();
            playSound('snd-cashier');
            toast(`✅ تم تسجيل طلبك (${paymentType}) بنجاح!`);
            state.cart = [];
            if(paymentType === "دفع محفظة") state.user.bal = data.currentBal;
            localStorage.setItem('abu_user_v30', JSON.stringify(state.user));
            ui();
            changeView('orders', document.querySelector("button[onclick*='orders']"));
        }
    } catch(e) { toast("❌ عطل في الشبكة"); }
}

// --- الوظائف القديمة (بقية الكود) ---
function ui() {
    if(!state.user) return;
    const topBal = document.getElementById('u-balance-top');
    if(topBal) topBal.innerText = Number(state.user.bal).toLocaleString() + " YER";
    const accName = document.getElementById('acc-name');
    if(accName) accName.innerText = state.user.name;
    const accPhone = document.getElementById('acc-phone');
    if(accPhone) accPhone.innerText = state.user.phone;
    const cartList = document.getElementById('cart-list');
    if(cartList) {
        const total = state.cart.reduce((s, i) => s + (i.price * i.qty), 0);
        const cartTotal = document.getElementById('cart-total');
        if(cartTotal) cartTotal.innerText = total.toLocaleString() + " YER";
        if(state.cart.length > 0) {
            cartList.innerHTML = state.cart.map(i => `
                <div class="p-4 bg-white/5 rounded-2xl flex justify-between items-center border border-white/5">
                    <div><h4 class="font-bold text-sm">${i.name}</h4><p class="text-xs text-emerald-400 mt-1">${(i.price * i.qty).toLocaleString()} YER</p></div>
                    <div class="flex items-center gap-3 bg-black/40 px-3 py-1.5 rounded-xl border border-white/5">
                        <button onclick="updateQty('${i._id}', -1)" class="text-xs text-slate-400">-</button>
                        <span class="text-xs font-black">${i.qty}</span>
                        <button onclick="updateQty('${i._id}', 1)" class="text-xs text-emerald-400">+</button>
                    </div>
                </div>
            `).join('');
        } else { cartList.innerHTML = `<div class="text-center py-12 text-xs text-slate-500 font-bold">حقيبة التسوق فارغة</div>`; }
    }
}

// (بقية الدوال مثل manualRefresh, sync, fetchAds, fetchGames... تبقى كما هي في ملفك الأصلي)
window.onload = () => { setTimeout(() => { if (state.user) unlockApp(); else { document.getElementById('splash').classList.add('hidden'); document.getElementById('auth-screen').classList.remove('hidden'); } }, 2000); };
async function unlockApp() { document.getElementById('splash').classList.add('hidden'); document.getElementById('auth-screen').classList.add('hidden'); document.getElementById('app-layout').classList.remove('hidden'); ui(); await initProducts(); await fetchAds(); await fetchGames(); await fetchMessages(); }
async function initProducts() { try { let rCat = await fetch(`${API}/api/categories`); state.categories = await rCat.json(); let rProd = await fetch(`${API}/api/products`); state.prods = await rProd.json(); renderCategories(); } catch (e) { toast("❌ عطل في جلب البيانات"); } }
function renderCategories() { const list = document.getElementById('categories-list'); if(!list) return; list.innerHTML = state.categories.map(c => `<div onclick="openCategory('${c.name}')" class="card-glass"><img src="${c.img}" class="w-full h-32 object-cover rounded-2xl mb-3"><h3 class="font-black text-sm text-slate-100">${c.name}</h3><p class="text-[9px] text-slate-500 mt-1">${c.sub || 'خدمات متميزة'}</p></div>`).join(''); }
function openCategory(catName) { document.getElementById('cat-title-display').innerText = catName; const list = document.getElementById('products-list'); const filtered = state.prods.filter(p => p.cat === catName); if(filtered.length > 0) { list.innerHTML = filtered.map(p => `<div onclick="openProductSheet('${p._id}')" class="p-4 bg-white/5 rounded-3xl border border-white/5 flex gap-4 items-center cursor-pointer active:scale-[0.99] transition"><img src="${p.img}" class="w-20 h-20 object-cover rounded-2xl"><div class="flex-1"><h3 class="font-black text-sm">${p.name}</h3><p class="text-xs text-emerald-400 font-bold mt-1">${Number(p.price).toLocaleString()} YER</p></div><i class="fas fa-plus text-xs text-emerald-500 bg-emerald-500/10 p-3 rounded-xl"></i></div>`).join(''); } else { list.innerHTML = `<div class="opacity-30 text-center py-12 text-xs font-bold">لا توجد منتجات</div>`; } document.getElementById('view-home').classList.add('hidden'); document.getElementById('view-products').classList.remove('hidden'); }
function openProductSheet(id) { const p = state.prods.find(x => x._id === id); document.getElementById('sh-img').src = p.img; document.getElementById('sh-name').innerText = p.name; document.getElementById('sh-price').innerText = Number(p.price).toLocaleString() + " YER"; document.getElementById('sh-add-btn').onclick = () => { addToCart(p); closeSheet(); }; document.getElementById('sheet-overlay').classList.remove('hidden'); setTimeout(() => document.getElementById('product-sheet').style.bottom = "0", 10); playSound('snd-click'); }
function addToCart(p) { let i = state.cart.find(x => x._id === p._id); if(i) i.qty++; else state.cart.push({...p, qty:1}); ui(); toast("🛒 أضيف للسلة بنجاح"); }
function updateQty(id, delta) { let i = state.cart.find(x => x._id === id); if(i) { i.qty += delta; if(i.qty <= 0) state.cart = state.cart.filter(x => x._id !== id); ui(); } }
async function changeView(viewId, btn) { playSound('snd-click'); document.querySelectorAll('.view-content').forEach(v => v.classList.add('hidden')); document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active')); document.getElementById(`view-${viewId}`).classList.remove('hidden'); if(btn) btn.classList.add('active'); ui(); }
function toast(m) { const t = document.getElementById('toast'); t.innerText = m; t.classList.remove('hidden'); setTimeout(() => t.classList.add('hidden'), 3500); }
function closeSheet() { document.getElementById('product-sheet').style.bottom = "-100%"; setTimeout(() => document.getElementById('sheet-overlay').classList.add('hidden'), 500); }
function playSound(id) { const s = document.getElementById(id); if(s) { s.currentTime = 0; s.play().catch(e=>{}); } }
function logout() { localStorage.clear(); location.reload(); }
