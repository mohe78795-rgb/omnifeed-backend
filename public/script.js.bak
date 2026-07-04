const API = window.location.origin;
let state = {
    categories: [], prods: [], cart: [], layoutMode: 0,
    user: JSON.parse(localStorage.getItem('abu_user_v30')) || null
};

let videoPlayer;

// --- 1. التحديث اليدوي (بدون خروج) ---
async function manualRefresh() {
    const btn = document.getElementById('refresh-btn');
    if(btn) btn.classList.add('rotate-180', 'opacity-50');
    
    await sync(); // تحديث الرصيد
    await initProducts(); // تحديث الأقسام والمنتجات
    await fetchAds(); // تحديث الفيديو
    await fetchMessages(); // تحديث الدردشة
    
    setTimeout(() => {
        if(btn) btn.classList.remove('rotate-180', 'opacity-50');
        toast("✅ تم مزامنة البيانات بنجاح");
    }, 600);
}

// --- 2. الفيديو المطور من قاعدة البيانات ---
async function fetchAds() {
    try {
        let res = await fetch(`${API}/api/ads`);
        let ads = await res.json();
        const container = document.getElementById('ad-video-container');
        if (ads && ads.length > 0 && ads[0].videoUrl) {
            const vidUrl = ads[0].videoUrl;
            const vidId = vidUrl.includes('embed/') ? vidUrl.split('embed/')[1].split('?')[0] : vidUrl.split('v=')[1];

            if (!videoPlayer) {
                videoPlayer = new Plyr('#player', {
                    controls: [], autoplay: true, muted: true, loop: { active: true },
                    youtube: { noCookie: true, rel: 0, showinfo: 0, iv_load_policy: 3, modestbranding: 1 }
                });
            }
            videoPlayer.source = { type: 'video', sources: [{ src: vidId, provider: 'youtube' }] };
            container.classList.remove('hidden');
        }
    } catch(e) { console.log("Ad Error"); }
}

function toggleMute() {
    if (videoPlayer) {
        videoPlayer.muted = !videoPlayer.muted;
        document.getElementById('mute-icon').className = videoPlayer.muted ? 'fas fa-volume-mute' : 'fas fa-volume-up';
    }
}

// --- 3. العرض الشبكي المتعدد ---
function setLayout(mode) {
    const container = document.getElementById('categories-list');
    if(!container) return;
    
    container.classList.remove('mode-matrix', 'mode-dual', 'mode-list');
    
    if(mode === 0) container.classList.add('mode-dual');
    else if(mode === 1) container.classList.add('mode-matrix');
    else if(mode === 2) container.classList.add('mode-list');
    
    // تحديث شكل الأزرار
    document.querySelectorAll('[id^="btn-layout-"]').forEach((btn, idx) => {
        btn.className = (idx === mode) ? 
            "px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-500 text-black transition" : 
            "px-3 py-1.5 rounded-xl text-xs font-black text-slate-400 transition";
    });
    state.layoutMode = mode;
}

// --- 4. الدردشة (فقاعات) ---
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
                <div class="flex ${isAdmin ? 'justify-start' : 'justify-end'} mb-2">
                    <div class="max-w-[85%] p-3 ${isAdmin ? 'bg-white/10 rounded-t-2xl rounded-bl-2xl border border-white/5' : 'bg-emerald-600 text-black rounded-t-2xl rounded-br-2xl'}">
                        <p class="text-[12px] font-bold">${m.body}</p>
                        <span class="text-[8px] opacity-40 block mt-1">${m.date}</span>
                    </div>
                </div>`;
            }).join('');
            list.scrollTop = list.scrollHeight;
        }
    } catch(e) { console.log("Chat Error"); }
}

async function sendUserMessage() {
    const inp = document.getElementById('chat-input');
    const msg = inp.value.trim();
    if(!msg) return;
    const res = await fetch(`${API}/api/messages/user-send`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ sender: state.user.phone, body: msg })
    });
    if(res.ok) { inp.value = ""; fetchMessages(); }
}

// --- وظائف المزامنة والتشغيل الأساسية ---
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
}

async function initProducts() {
    state.categories = await (await fetch(`${API}/api/categories`)).json();
    state.prods = await (await fetch(`${API}/api/products`)).json();
    renderCategories();
}

function renderCategories() {
    const list = document.getElementById('categories-list');
    list.innerHTML = state.categories.map(c => `
        <div onclick="openCategory('${c.name}')" class="card-glass p-4">
            <img src="${c.img}" class="w-full h-24 object-cover rounded-2xl mb-2">
            <h3 class="font-black text-[11px]">${c.name}</h3>
        </div>`).join('');
}

async function sync() {
    if(!state.user) return;
    const res = await fetch(`${API}/api/auth/user/${state.user.phone}`);
    const d = await res.json(); 
    if(d.success) { 
        state.user = d.user; 
        localStorage.setItem('abu_user_v30', JSON.stringify(state.user)); 
        ui(); 
    }
}

function toast(m) {
    const t = document.getElementById('toast');
    t.innerText = m; t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 3000);
}

function changeView(v, btn) {
    document.querySelectorAll('.view-content').forEach(x => x.classList.add('hidden'));
    document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
    document.getElementById(`view-${v}`).classList.remove('hidden');
    if(btn) btn.classList.add('active');
    if(v === 'notifications') fetchMessages();
}

window.onload = () => { if(state.user) unlockApp(); else { document.getElementById('splash').classList.add('hidden'); document.getElementById('auth-screen').classList.remove('hidden'); } };
