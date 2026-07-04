const API = window.location.origin; // ليعمل السيرفر تلقائياً محلياً أو على ريندر
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

// --- دالة ذكية لمعالجة وتنظيف روابط الصور (بما فيها روابط جوجل المعقدة) ---
function fixImageUrl(url) {
    if (!url) return 'https://placehold.co/600x400/0c0f14/emerald?text=No+Image';
    
    let cleanedUrl = url.trim();

    // 1. معالجة روابط تحويل بحث جوجل المباشر واستخراج الرابط الأصلي منها
    if (cleanedUrl.includes('google.com/url?')) {
        try {
            const urlParams = new URLSearchParams(cleanedUrl.split('?')[1]);
            if (urlParams.has('imgurl')) {
                return decodeURIComponent(urlParams.get('imgurl'));
            } else if (urlParams.has('q')) {
                return decodeURIComponent(urlParams.get('q'));
            }
        } catch (e) { console.error("خطأ في فك رابط جوجل:", e); }
    }

    // 2. معالجة روابط عرض الصور من جوجل درايف وتحويلها لرابط عرض مباشر
    if (cleanedUrl.includes('drive.google.com/file/d/')) {
        const matches = cleanedUrl.match(/\/file\/d\/([^\/]+)/);
        if (matches && matches[1]) {
            return `https://drive.google.com/uc?export=view&id=${matches[1]}`;
        }
    }

    // 3. معالجة الصور المشفرة Base64 النصية المباشرة (تترك كما هي لأن المتصفح يقرأها)
    if (cleanedUrl.startsWith('data:image/')) {
        return cleanedUrl;
    }

    return cleanedUrl;
}

// --- تفعيل ميزة السحب للأسفل للتحديث (Pull to Refresh) ---\nlet touchStart = 0;
window.addEventListener('touchstart', e => { touchStart = e.touches[0].pageY; }, {passive: true});
window.addEventListener('touchmove', e => {
    const touchMove = e.touches[0].pageY;
    if (window.scrollY === 0 && touchMove > touchStart + 160) {
        touchStart = 999999; // منع التكرار العشوائي
        manualRefresh();
    }
}, {passive: true});

async function manualRefresh() {
    const btn = document.getElementById('refresh-btn');
    if(btn) btn.classList.add('rotate-180', 'opacity-50');
    toast("⏳ جاري تحديث ومزامنة البيانات الفورية...");

    await sync();
    await initProducts();
    await fetchAds();
    await fetchMessages();

    if(btn) {
        setTimeout(() => {
            btn.classList.remove('rotate-180', 'opacity-50');
        }, 500);
    }
    toast("✅ تم التحديث بنجاح");
}

// المزامنة الدورية الصامتة كل 15 ثانية
setInterval(async () => {
    if(state.user) {
        await sync();
        await fetchMessages();
    }
}, 15000);

window.addEventListener('DOMContentLoaded', async () => {
    checkLocalUser();
    await initProducts();
    await fetchAds();
    await fetchMessages();
    setLayout(0);
});

function checkLocalUser() {
    if(state.user) {
        document.getElementById('auth-section').classList.add('hidden');
        document.getElementById('profile-section').classList.remove('hidden');
        document.getElementById('user-display-name').innerText = state.user.name;
        document.getElementById('user-display-phone').innerText = state.user.phone;
        document.getElementById('user-display-balance').innerText = state.user.bal;
    } else {
        document.getElementById('auth-section').classList.remove('hidden');
        document.getElementById('profile-section').classList.add('hidden');
    }
}

async function sync() {
    if(!state.user) return;
    try {
        const res = await fetch(`${API}/api/auth/user/${state.user.phone}`);
        const reply = await res.json();
        if(reply.success) {
            state.user = reply.user;
            localStorage.setItem('abu_user_v30', JSON.stringify(state.user));
            const balView = document.getElementById('user-display-balance');
            if(balView) balView.innerText = state.user.bal;
        }
    } catch(e){}
}

// جلب المنتجات والأقسام وعرضها مع معالجة الصور الذكية
async function initProducts() {
    try {
        const resCat = await fetch(`${API}/api/categories`);
        state.categories = await resCat.json();

        const resProd = await fetch(`${API}/api/products`);
        state.prods = await resProd.json();

        renderCategories();
        renderProducts("ALL");
    } catch (e) {
        toast("❌ عطل في جلب البيانات من السيرفر");
    }
}

function renderCategories() {
    const container = document.getElementById('categories-chips');
    if(!container) return;
    
    let html = `<button onclick="filterCategory('ALL', this)" class="cat-chip active-chip shrink-0 px-5 py-2.5 rounded-xl font-bold text-xs">الكل</button>`;
    state.categories.forEach(c => {
        html += `<button onclick="filterCategory('${c.name}', this)" class="cat-chip shrink-0 bg-white/5 text-slate-400 border border-white/5 px-5 py-2.5 rounded-xl font-bold text-xs transition">${c.name}</button>`;
    });
    container.innerHTML = html;
}

function filterCategory(catName, btn) {
    document.querySelectorAll('.cat-chip').forEach(b => {
        b.classList.remove('active-chip', 'bg-emerald-500', 'text-black');
        b.classList.add('bg-white/5', 'text-slate-400');
    });
    btn.classList.remove('bg-white/5', 'text-slate-400');
    btn.classList.add('active-chip');
    renderProducts(catName);
}

function renderProducts(catName) {
    const container = document.getElementById('categories-list');
    if(!container) return;

    let filtered = state.prods;
    if(catName !== "ALL") {
        filtered = state.prods.filter(p => p.cat === catName);
    }

    if(filtered.length === 0) {
        container.innerHTML = `<div class="col-span-full py-12 text-center text-slate-500 font-bold text-xs">لا توجد خدمات أو منتجات متوفرة حالياً في هذا القسم</div>`;
        return;
    }

    container.innerHTML = filtered.map(p => `
        <div onclick="openProductSheet('${p.name}', ${p.price}, '${p.img}', '${p.cat}')" class="card-glass flex flex-col justify-between">
            <img src="${fixImageUrl(p.img)}" alt="${p.name}" class="w-full h-32 object-cover rounded-2xl mb-3 bg-slate-900/60" loading="lazy" onerror="this.src='https://placehold.co/600x400/0c0f14/emerald?text=Image+Error'">
            <div>
                <h3 class="font-black text-xs text-right leading-relaxed text-slate-100">${p.name}</h3>
                <div class="flex justify-between items-center mt-2">
                    <span class="text-[10px] font-black text-emerald-400">${p.price} YER</span>
                    <span class="text-[9px] text-slate-500 font-bold bg-white/5 px-2 py-0.5 rounded-md">${p.cat}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// --- معالجة وعرض فيديو الإعلان الترويجي الأعلى وحظر التحكم فيه ---
async function fetchAds() {
    try {
        const res = await fetch(`${API}/api/ads`);
        const ads = await res.json();
        const container = document.getElementById('ad-banner-container');
        if(!container) return;

        if(ads && ads.length > 0) {
            const videoUrl = ads[0].videoUrl;
            let videoId = "";
            const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
            const match = videoUrl.match(regExp);
            if (match && match[2].length == 11) { videoId = match[2]; }

            if(videoId) {
                container.innerHTML = `
                    <div class="relative w-full rounded-3xl overflow-hidden aspect-video border border-white/5 shadow-2xl bg-black">
                        <div class="absolute inset-0 z-10 bg-transparent"></div>
                        
                        <iframe id="yt-player" class="w-full h-full pointer-events-none scale-[1.35]" 
                            src="https://www.youtube.com/embed/${videoId}?enablejsapi=1&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&autoplay=1&mute=1&loop=1&playlist=${videoId}" 
                            frameborder="0" allow="autoplay; encrypted-media" allowfullscreen>
                        </iframe>

                        <button id="btn-toggle-mute" onclick="toggleVideoMute()" class="absolute bottom-4 left-4 z-20 bg-black/75 text-emerald-400 px-4 py-2 rounded-xl text-xs font-black border border-white/10 flex items-center gap-2 backdrop-blur-md active:scale-95 transition">
                            <i id="mute-icon" class="fas fa-volume-mute"></i>
                            <span id="mute-text">فتح الصوت</span>
                        </button>
                    </div>
                `;
                container.classList.remove('hidden');
            }
        } else {
            container.classList.add('hidden');
        }
    } catch(e) { console.error(e); }
}

let isVideoMuted = true;
function toggleVideoMute() {
    const iframe = document.getElementById('yt-player');
    const icon = document.getElementById('mute-icon');
    const text = document.getElementById('mute-text');
    if(!iframe) return;

    if(isVideoMuted) {
        iframe.contentWindow.postMessage('{"event":"command","func":"unMute","args":""}', '*');
        icon.className = "fas fa-volume-up";
        text.innerText = "كتم الصوت";
        isVideoMuted = false;
    } else {
        iframe.contentWindow.postMessage('{"event":"command","func":"mute","args":""}', '*');
        icon.className = "fas fa-volume-mute";
        text.innerText = "فتح الصوت";
        isVideoMuted = true;
    }
}

// --- مراسلة السيرفر وقاعدة البيانات مباشرة (بدون الخروج لواتساب) ---
async function sendSupportMessage() {
    if(!state.user) return toast("⚠️ يجب تسجيل الدخول أولاً لإرسال رسالة");
    
    const input = document.getElementById('support-msg-input');
    if(!input || !input.value.trim()) return;

    const bodyText = input.value.trim();
    
    try {
        const res = await fetch(`${API}/api/messages/send-from-client`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                phone: state.user.phone,
                title: `رسالة من العميل: ${state.user.name}`,
                body: bodyText
            })
        });
        
        const reply = await res.json();
        if(reply.success) {
            input.value = "";
            toast("✅ تم إرسال رسالتك إلى لوحة التحكم بنجاح");
            await fetchMessages(); // تحديث صندوق الرسائل فوراً لترى ما أرسلته
        } else {
            toast("❌ فشل إرسال الرسالة");
        }
    } catch(e) {
        toast("❌ خطأ في الاتصال بالسيرفر");
    }
}

// جلب رسائل واستجابات الإدارة من السيرفر
async function fetchMessages() {
    if(!state.user) return;
    try {
        const res = await fetch(`${API}/api/messages/${state.user.phone}`);
        const list = await res.json();
        
        const dot = document.getElementById('msg-dot');
        const container = document.getElementById('notifications-list');
        if(!container) return;

        if(list.length > 0) {
            if(dot) dot.classList.remove('hidden');
            container.innerHTML = list.map(m => `
                <div class="p-5 bg-white/5 border border-white/5 rounded-2xl space-y-2 text-right">
                    <div class="flex justify-between items-center">
                        <span class="text-[10px] text-slate-500">${m.date}</span>
                        <h4 class="font-black text-xs text-emerald-400">${m.title}</h4>
                    </div>
                    <p class="text-xs text-slate-300 leading-relaxed">${m.body}</p>
                </div>
            `).join('');
        } else {
            if(dot) dot.classList.add('hidden');
            container.innerHTML = `<div class="py-12 text-center text-slate-600 font-bold text-xs">صندوق الرسائل والإشعارات فارغ حالياً</div>`;
        }
    } catch(e){}
}

// فتح شيت تفاصيل المنتج والمعالجة الفورية لصورتها
function openProductSheet(name, price, img, cat) {
    playSound('snd-click');
    document.getElementById('sh-img').src = fixImageUrl(img);
    document.getElementById('sh-name').innerText = name;
    document.getElementById('sh-price').innerText = `${price} YER`;
    document.getElementById('sh-cat').innerText = cat;
    
    document.getElementById('sheet-overlay').classList.remove('hidden');
    const sheet = document.getElementById('product-sheet');
    sheet.style.bottom = "0";
    
    state.cart = [{ name, price, img, cat, qty: 1 }];
}

async function handleOrderSubmit() {
    if(!state.user) { closeSheet(); return toast("⚠️ يرجى تسجيل الدخول أولاً لإتمام الشراء"); }
    if(state.cart.length === 0) return;

    const currentItem = state.cart[0];
    if(state.user.bal < currentItem.price) {
        closeSheet();
        return toast("❌ رصيدك الحالي غير كافٍ، اتصل بالأدمن لتعبئة حسابك");
    }

    playSound('snd-cashier');
    toast("⏳ جاري معالجة الفاتورة وسحب الرصيد...");

    try {
        const res = await fetch(`${API}/api/orders/add`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                phone: state.user.phone,
                order: { items: state.cart, total: currentItem.price }
            })
        });

        const reply = await res.json();
        if(reply.success) {
            await sync();
            closeSheet();
            toast("✅ تم إرسال الطلب بنجاح! راجع التحديثات في فواتيري");
        } else {
            toast("❌ فشل في إتمام عملية الشراء من قاعدة البيانات");
        }
    } catch(e) {
        toast("❌ خطأ في الشبكة أثناء الشراء");
    }
}

// فتح شيت تعبئة رصيد الألعاب
async function openGameTopup(gameCode) {
    playSound('snd-click');
    if(!state.user) return toast("⚠️ يجب تسجيل الدخول لشحن الألعاب");
    
    toast("⏳ جاري تحميل حزم الشحن...");
    try {
        const res = await fetch(`${API}/api/games`);
        const reply = await res.json();
        if(reply.success) {
            const game = reply.game_list.find(g => g.game_code === gameCode);
            if(!game) return;

            state.selectedGame = game;
            document.getElementById('game-title').innerText = game.game_name;
            
            const denomList = document.getElementById('denom-list');
            denomList.innerHTML = game.denominations.map(d => `
                <button onclick="selectDenom('${d.id}', ${d.price}, '${d.name}')" id="denom-${d.id}" class="w-full text-right p-4 bg-white/5 border border-white/5 rounded-2xl flex justify-between items-center transition active:scale-95">
                    <span class="text-xs font-black text-emerald-400">${d.price} YER</span>
                    <span class="text-xs font-bold text-slate-200">${d.name}</span>
                </button>
            `).join('');

            document.getElementById('game-topup-sheet').classList.remove('hidden');
        }
    } catch(e) { toast("❌ عطل في جلب باقات الشحن"); }
}

function selectDenom(id, price, name) {
    state.selectedDenom = { id, price, name };
    document.querySelectorAll('[id^="denom-"]').forEach(b => b.classList.replace('border-emerald-500', 'border-white/5'));
    document.getElementById(`denom-${id}`).classList.replace('border-white/5', 'border-emerald-500');
}

async function validateAndPayGame() {
    const gameUserId = document.getElementById('game-user-id').value.trim();
    if(!gameUserId) return toast("⚠️ يرجى إدخال معرف اللاعب (ID)");
    if(!state.selectedDenom) return toast("⚠️ يرجى اختيار الفئة المطلوبة للشحن");

    if(state.user.bal < state.selectedDenom.price) return toast("❌ رصيدك لا يكفي لشراء هذه الباقة");

    toast("⏳ جاري التحقق من المعرف وتثبيت العملية...");
    try {
        const checkRes = await fetch(`${API}/api/games/validate-user`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ user_id: gameUserId })
        });
        const checkReply = await checkRes.json();
        
        if(checkReply.success) {
            const confirmAction = confirm(`هل أنت متأكد من الشحن للاعب:\n[ ${checkReply.player_name} ]\nالتكلفة: ${state.selectedDenom.price} YER؟`);
            if(!confirmAction) return;

            const topupRes = await fetch(`${API}/api/games/topup`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    phone: state.user.phone,
                    price: state.selectedDenom.price,
                    game_code: state.selectedGame.game_code,
                    user_id: gameUserId,
                    denomination_id: state.selectedDenom.id
                })
            });
            
            const topupReply = await topupRes.json();
            if(topupReply.success) {
                await sync();
                closeGameSheet();
                toast(`⚡ تم شحن [ ${state.selectedDenom.name} ] بنجاح وتحديث المحفظة!`);
            } else {
                toast("❌ فشلت عملية شحن اللعبة بالسيرفر");
            }
        }
    } catch(e) { toast("❌ خطأ أثناء الاتصال بمنظومة الشحن السحابية"); }
}

// جلب وعرض أرشيف الفواتير السابقة للعميل
async function fetchOrders() {
    if(!state.user) return;
    try {
        const res = await fetch(`${API}/api/orders/${state.user.phone}`);
        const list = await res.json();
        const container = document.getElementById('orders-list');
        if(!container) return;

        if(list.length > 0) {
            container.innerHTML = list.map(o => `
                <div class="p-5 bg-white/5 border border-white/5 rounded-3xl space-y-3 text-right">
                    <div class="flex justify-between items-center">
                        <span class="text-[10px] text-slate-500">${o.date}</span>
                        <span class="text-xs font-black text-emerald-400">${o.id}</span>
                    </div>
                    <div class="text-xs text-slate-300 font-bold">${o.items.map(i=> i.name).join(' | ')}</div>
                    <div class="flex justify-between items-center border-t border-white/5 pt-2">
                        <span class="px-3 py-1 bg-white/5 border border-white/5 rounded-xl text-[10px] font-black text-amber-400">${o.status}</span>
                        <span class="text-xs font-black text-emerald-400">${o.total} YER</span>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = `<div class="py-12 text-center text-slate-600 font-bold text-xs">لا توجد لديك فواتير أو طلبات سابقة</div>`;
        }
    } catch(e){}
}

// الحسابات والتسجيل
async function handleAuth() {
    const isLogin = document.getElementById('auth-title').innerText === "تسجيل الدخول";
    const name = document.getElementById('auth-name').value.trim();
    const phone = document.getElementById('auth-phone').value.trim();
    const pass = document.getElementById('auth-pass').value.trim();

    if(!phone || !pass || (!isLogin && !name)) return toast("⚠️ يرجى ملء كافة الحقول المطلوبة");

    toast("⏳ جاري المزامنة الآمنة مع السيرفر...");
    const path = isLogin ? '/api/auth/login' : '/api/auth/signup';
    
    try {
        const res = await fetch(`${API}${path}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ name, phone, pass })
        });
        const reply = await res.json();

        if(reply.success) {
            state.user = reply.user;
            localStorage.setItem('abu_user_v30', JSON.stringify(state.user));
            checkLocalUser();
            await fetchMessages();
            toast(`👋 أهلاً بك بنجاح في تطبيق تموينات أبو حسين`);
        } else {
            toast(`❌ ${reply.message || "حدث خطأ غير متوقع"}`);
        }
    } catch(e) { toast("❌ فشل الاتصال بالسيرفر المركزي لتوثيق الحساب"); }
}

function toggleAuthMode() {
    const title = document.getElementById('auth-title');
    const nameBox = document.getElementById('auth-name-box');
    const btn = document.getElementById('auth-submit-btn');
    const toggleBtn = document.getElementById('auth-toggle-btn');
    const toggleText = document.getElementById('auth-toggle-text');

    if(title.innerText === "تسجيل الدخول") {
        title.innerText = "إنشاء حساب جديد";
        nameBox.classList.remove('hidden');
        btn.innerText = "تأكيد وتثبيت الحساب";
        toggleText.innerText = "لديك حساب بالفعل؟";
        toggleBtn.innerText = "تسجيل دخول فوراً";
    } else {
        title.innerText = "تسجيل الدخول";
        nameBox.classList.add('hidden');
        btn.innerText = "دخول آمن";
        toggleText.innerText = "ليس لديك حساب؟";
        toggleBtn.innerText = "إنشاء حساب جديد";
    }
}

function changeView(viewId, btn) {
    playSound('snd-click');
    document.querySelectorAll('.view-panel').forEach(p => p.classList.add('hidden'));
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('text-emerald-400'));
    
    const targetPanel = document.getElementById(`view-${viewId}`);
    if(targetPanel) targetPanel.classList.remove('hidden');
    if(btn) btn.classList.add('text-emerald-400');

    if(viewId === 'home') { renderProducts("ALL"); }
    if(viewId === 'orders') { fetchOrders(); }
    if(viewId === 'notifications') { fetchMessages(); }
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
    if(mode === 1) container.classList.add('mode-matrix');
    if(mode === 2) container.classList.add('mode-list');
    state.layoutMode = mode;
}

function logout() { localStorage.clear(); location.reload(); }
function toast(m) { const t = document.getElementById('toast'); t.innerText = m; t.classList.remove('hidden'); setTimeout(() => t.classList.add('hidden'), 3500); }
function closeSheet() { document.getElementById('product-sheet').style.bottom = "-100%"; document.getElementById('sheet-overlay').classList.add('hidden'); }
function closeGameSheet() { document.getElementById('game-topup-sheet').classList.add('hidden'); state.selectedGame = null; state.selectedDenom = null; document.getElementById('game-user-id').value = ""; }
function playSound(id) { const s = document.getElementById(id); if(s) { s.currentTime = 0; s.play().catch(e=>{}); } }
