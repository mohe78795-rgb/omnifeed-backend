const API = window.location.origin;
let state = {
    categories: [], prods: [], cart: [], 
    user: JSON.parse(localStorage.getItem('abu_user_v30')) || null,
    games: [], selectedGame: null, selectedDenom: null
};

let videoPlayer;

// جلب الفيديو من قاعدة البيانات وتشغيله بـ Plyr
async function fetchAds() {
    try {
        let res = await fetch(`${API}/api/ads`);
        let ads = await res.json();
        const container = document.getElementById('ad-video-container');
        
        if (ads && ads.length > 0 && ads[0].videoUrl) {
            // استخراج ID يوتيوب من الرابط المخزن في DB
            const vidUrl = ads[0].videoUrl;
            const vidId = vidUrl.split('embed/')[1] || vidUrl.split('v=')[1];

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

// نظام الدردشة المتطور
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
                <div class="flex ${isAdmin ? 'justify-start' : 'justify-end'} animate-fadeIn">
                    <div class="max-w-[80%] p-3 ${isAdmin ? 'bg-white/10 rounded-t-2xl rounded-bl-2xl border border-white/5' : 'bg-emerald-600 text-black rounded-t-2xl rounded-br-2xl'}">
                        <p class="text-[11px] font-bold">${m.body}</p>
                        <span class="text-[7px] opacity-40 block mt-1">${m.date}</span>
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

// الوظائف الأساسية
async function unlockApp() {
    document.getElementById('splash').classList.add('hidden');
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-layout').classList.remove('hidden');
    ui(); fetchAds(); initProducts();
}

function ui() {
    if(!state.user) return;
    document.getElementById('u-balance-top').innerText = Number(state.user.bal).toLocaleString() + " YER";
    document.getElementById('u-avatar').innerText = state.user.name.charAt(0);
}

async function initProducts() {
    state.categories = await (await fetch(`${API}/api/categories`)).json();
    state.prods = await (await fetch(`${API}/api/products`)).json();
    document.getElementById('categories-list').innerHTML = state.categories.map(c => `
        <div onclick="openCategory('${c.name}')" class="bg-white/5 p-4 rounded-3xl border border-white/5 text-center">
            <img src="${c.img}" class="w-full h-24 object-cover rounded-2xl mb-2">
            <h3 class="text-xs font-black">${c.name}</h3>
        </div>`).join('');
}

async function handleAuth() {
    const isS = !document.getElementById('signup-name-container').classList.contains('hidden');
    const name = document.getElementById('auth-name').value;
    const phone = document.getElementById('auth-phone').value;
    const pass = document.getElementById('auth-pass').value;
    
    const res = await fetch(`${API}/api/auth/${isS?'signup':'login'}`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ name, phone, pass })
    });
    const d = await res.json();
    if(d.success) { 
        state.user = d.user; 
        localStorage.setItem('abu_user_v30', JSON.stringify(state.user)); 
        unlockApp(); 
    } else alert(d.message);
}

function toggleAuthMode() {
    document.getElementById('signup-name-container').classList.toggle('hidden');
    const isS = !document.getElementById('signup-name-container').classList.contains('hidden');
    document.getElementById('auth-title').innerText = isS ? "إنشاء حساب جديد" : "تسجيل الدخول";
    document.getElementById('auth-btn').innerText = isS ? "تسجيل جديد" : "دخول آمن";
}

function changeView(v, btn) {
    document.querySelectorAll('.view-content').forEach(x => x.classList.add('hidden'));
    document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
    document.getElementById(`view-${v}`).classList.remove('hidden');
    if(btn) btn.classList.add('active');
    if(v === 'notifications') fetchMessages();
}

window.onload = () => { if(state.user) unlockApp(); else { document.getElementById('splash').classList.add('hidden'); document.getElementById('auth-screen').classList.remove('hidden'); } };
