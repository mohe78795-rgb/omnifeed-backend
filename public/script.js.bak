const API = window.location.origin;
let state = {
    categories: [], prods: [], cart: [], 
    user: JSON.parse(localStorage.getItem('abu_user_v30')) || null,
    games: [], selectedGame: null, selectedDenom: null
};

let videoPlayer;

// --- 1. جلب الفيديو من قاعدة البيانات وتشغيله بـ Plyr ---
async function fetchAds() {
    try {
        let res = await fetch(`${API}/api/ads`);
        let ads = await res.json();
        const container = document.getElementById('ad-video-container');
        
        if (ads && ads.length > 0 && ads[0].videoUrl) {
            // استخراج ID الفيديو من الرابط المخزن لـ Plyr
            const vidUrl = ads[0].videoUrl;
            let vidId = vidUrl.includes('embed/') ? vidUrl.split('embed/')[1].split('?')[0] : vidUrl.split('v=')[1];

            if (!videoPlayer) {
                videoPlayer = new Plyr('#player', {
                    controls: [], autoplay: true, muted: true, loop: { active: true },
                    youtube: { noCookie: true, rel: 0, showinfo: 0, iv_load_policy: 3, modestbranding: 1 }
                });
            }
            videoPlayer.source = { type: 'video', sources: [{ src: vidId, provider: 'youtube' }] };
            container.classList.remove('hidden');
        } else {
            container.classList.add('hidden');
        }
    } catch(e) { console.log("Ad Error:", e); }
}

function toggleMute() {
    if (videoPlayer) {
        videoPlayer.muted = !videoPlayer.muted;
        document.getElementById('mute-icon').className = videoPlayer.muted ? 'fas fa-volume-mute' : 'fas fa-volume-up';
    }
}

// --- 2. نظام الدردشة المطور (إرسال واستقبال) ---
async function fetchMessages() {
    if(!state.user) return;
    try {
        const res = await fetch(`${API}/api/messages/${state.user.phone}`);
        const data = await res.json();
        const list = document.getElementById('messages-list');
        if(data) {
            list.innerHTML = data.map(m => {
                const isAdmin = m.sender === "ADMIN";
                return `
                <div class="flex ${isAdmin ? 'justify-start' : 'justify-end'} mb-2 animate-fadeIn">
                    <div class="max-w-[85%] p-3 ${isAdmin ? 'bg-white/10 rounded-t-2xl rounded-bl-2xl border border-white/5' : 'bg-emerald-600 text-black rounded-t-2xl rounded-br-2xl'}">
                        <p class="text-[12px] font-bold">${m.body}</p>
                        <span class="text-[8px] opacity-40 block mt-1">${m.date}</span>
                    </div>
                </div>`;
            }).join('');
            list.scrollTop = list.scrollHeight;
        }
    } catch(e) { console.log("Chat Error:", e); }
}

async function sendUserMessage() {
    const inp = document.getElementById('chat-input');
    const msg = inp.value.trim();
    if(!msg) return;
    try {
        const res = await fetch(`${API}/api/messages/user-send`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ sender: state.user.phone, body: msg })
        });
        if(res.ok) { inp.value = ""; fetchMessages(); }
    } catch(e) { alert("فشل في إرسال الرسالة"); }
}

// --- 3. إدارة المتجر والحساب ---

async function unlockApp() {
    document.getElementById('splash').classList.add('hidden');
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-layout').classList.remove('hidden');
    ui(); fetchAds(); initProducts(); fetchMessages();
}

function ui() {
    if(!state.user) return;
    document.getElementById('u-balance-top').innerText = Number(state.user.bal).toLocaleString() + " YER";
    document.getElementById('u-avatar').innerText = state.user.name.charAt(0);
    document.getElementById('acc-name').innerText = state.user.name;
    document.getElementById('acc-phone').innerText = state.user.phone;
}

async function initProducts() {
    state.categories = await (await fetch(`${API}/api/categories`)).json();
    state.prods = await (await fetch(`${API}/api/products`)).json();
    document.getElementById('categories-list').innerHTML = state.categories.map(c => `
        <div onclick="openCategory('${c.name}')" class="bg-white/5 p-4 rounded-3xl border border-white/5 text-center cursor-pointer active:scale-95 transition">
            <img src="${c.img}" class="w-full h-24 object-cover rounded-2xl mb-2">
            <h3 class="text-xs font-black">${c.name}</h3>
        </div>`).join('');
}

function openCategory(n) {
    document.getElementById('cat-title-display').innerText = n;
    const filtered = state.prods.filter(p => p.cat === n);
    document.getElementById('products-list').innerHTML = filtered.map(p => `
        <div onclick="openProductSheet('${p._id}')" class="p-4 bg-white/5 rounded-2xl flex justify-between items-center mb-2">
            <div class="flex items-center gap-4">
                <img src="${p.img}" class="w-16 h-16 rounded-xl object-cover">
                <div><h4 class="font-bold text-sm">${p.name}</h4><p class="text-emerald-400 font-bold text-xs">${p.price} YER</p></div>
            </div>
            <i class="fas fa-plus-circle text-emerald-500"></i>
        </div>`).join('');
    changeView('products');
}

function openProductSheet(id) {
    const p = state.prods.find(x => x._id === id);
    document.getElementById('sh-img').src = p.img;
    document.getElementById('sh-name').innerText = p.name;
    document.getElementById('sh-price').innerText = p.price.toLocaleString() + " YER";
    document.getElementById('sh-add-btn').onclick = () => { addToCart(p); closeSheet(); };
    document.getElementById('sheet-overlay').classList.remove('hidden');
    setTimeout(() => document.getElementById('product-sheet').style.bottom = "0", 10);
}

function addToCart(p) {
    let i = state.cart.find(x => x._id === p._id);
    if(i) i.qty++; else state.cart.push({...p, qty:1});
    toast("🛒 تمت الإضافة للسلة");
    ui();
}

async function checkout() {
    const total = state.cart.reduce((s, i) => s + (i.price * i.qty), 0);
    if(state.user.bal < total) return toast("❌ الرصيد غير كافٍ");
    const res = await fetch(`${API}/api/orders/add`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ phone: state.user.phone, order: { total, items: state.cart } })
    });
    if(res.ok) { 
        state.cart = []; 
        await sync(); 
        changeView('orders'); 
        toast("✅ تم إرسال الطلب بنجاح"); 
    }
}

async function loadOrders() {
    const orders = await (await fetch(`${API}/api/orders/${state.user.phone}`)).json();
    document.getElementById('orders-list').innerHTML = orders.map(o => `
        <div class="p-4 bg-white/5 rounded-2xl border border-white/5 flex justify-between items-center mb-3">
            <div><h4 class="font-bold text-xs">${o.id}</h4><p class="text-[10px] text-slate-400">${o.status}</p></div>
            <div class="font-black text-emerald-400 text-sm">${o.total} YER</div>
        </div>`).join('');
}

async function handleAuth() {
    const isS = !document.getElementById('signup-name-container').classList.contains('hidden');
    const name = document.getElementById('auth-name').value;
    const phone = document.getElementById('auth-phone').value;
    const pass = document.getElementById('auth-pass').value;
    
    try {
        const res = await fetch(`${API}/api/auth/${isS?'signup':'login'}`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ name, phone, pass })
        });
        const d = await res.json();
        if(d.success) { 
            state.user = d.user; 
            localStorage.setItem('abu_user_v30', JSON.stringify(state.user)); 
            unlockApp(); 
        } else alert("❌ " + d.message);
    } catch(e) { alert("حدث خطأ في الاتصال"); }
}

async function sync() {
    if(!state.user) return;
    try {
        const res = await fetch(`${API}/api/auth/user/${state.user.phone}`);
        const d = await res.json();
        if(d.success) { state.user = d.user; localStorage.setItem('abu_user_v30', JSON.stringify(state.user)); ui(); }
    } catch(e) {}
}

function changeView(v, btn) {
    document.querySelectorAll('.view-content').forEach(x => x.classList.add('hidden'));
    document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
    document.getElementById(`view-${v}`).classList.remove('hidden');
    if(btn) btn.classList.add('active');
    if(v === 'notifications') fetchMessages();
    if(v === 'orders') loadOrders();
}

function toast(m) {
    const t = document.getElementById('toast');
    t.innerText = m; t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 3000);
}

function toggleAuthMode() {
    document.getElementById('signup-name-container').classList.toggle('hidden');
    const isS = !document.getElementById('signup-name-container').classList.contains('hidden');
    document.getElementById('auth-title').innerText = isS ? "إنشاء حساب" : "تسجيل الدخول";
    document.getElementById('auth-btn').innerText = isS ? "تسجيل جديد" : "دخول آمن";
}

function closeSheet() { 
    document.getElementById('product-sheet').style.bottom = "-100%"; 
    setTimeout(() => document.getElementById('sheet-overlay').classList.add('hidden'), 500); 
}

function logout() { localStorage.clear(); location.reload(); }

window.onload = () => { 
    setTimeout(() => { 
        if(state.user) unlockApp(); 
        else { 
            document.getElementById('splash').classList.add('hidden'); 
            document.getElementById('auth-screen').classList.remove('hidden'); 
        } 
    }, 2000); 
};
