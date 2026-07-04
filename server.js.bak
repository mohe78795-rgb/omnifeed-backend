const express = require('express');                                              
const mongoose = require('mongoose');                                            
const cors = require('cors');
const path = require('path');                                                                                                                                     
require('dotenv').config(); 

const app = express();
const PORT = process.env.PORT || 3000;                                           

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ متصل بسحابة أبو حسين (MongoDB)"))
    .catch(err => console.error("❌ خطأ في الاتصال بقاعدة البيانات:", err));

// --- 🗃️ تعريف قواعد البيانات (Schemas & Models) ---\nconst User = mongoose.model('User', new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    pass: { type: String, required: true },
    bal: { type: Number, default: 0 },
    joinDate: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) }
}));

const Category = mongoose.model('Category', new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    sub: String,
    img: String
}));

const Product = mongoose.model('Product', new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    img: String,
    cat: { type: String, required: true }
}));

const Order = mongoose.model('Order', new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    items: { type: Array, required: true },
    total: { type: Number, required: true },
    status: { type: String, default: 'قيد المراجعة ⏳' },
    date: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) }
}));

const Message = mongoose.model('Message', new mongoose.Schema({
    sender: { type: String, required: true },
    receiver: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    date: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) }
}));

const Ad = mongoose.model('Ad', new mongoose.Schema({
    videoUrl: { type: String, required: true },
    active: { type: Boolean, default: true }
}));

const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || "ABU_HUSSEIN_2026";

// --- 🛠️ دالة معالجة روابط صور جوجل وجوجل درايف تلقائياً ---
function fixGoogleImageUrl(url) {
    if (!url) return url;
    let clean = url.trim();
    if (clean.includes('google.com/url?')) {
        try {
            const urlParams = new URLSearchParams(clean.split('?')[1]);
            if (urlParams.has('imgurl')) return decodeURIComponent(urlParams.get('imgurl'));
            if (urlParams.has('q')) return decodeURIComponent(urlParams.get('q'));
        } catch (e) {}
    }
    if (clean.includes('drive.google.com/file/d/')) {
        const matches = clean.match(/\/file\/d\/([^\/]+)/);
        if (matches && matches[1]) return `https://drive.google.com/uc?export=view&id=${matches[1]}`;
    }
    return clean;
}

function makeEmbedUrl(url) {
    if(!url) return "";
    let id = "";
    if(url.includes("v=")) id = url.split("v=")[1].split("&")[0];
    else if(url.includes("youtu.be/")) id = url.split("youtu.be/")[1].split("?")[0];
    else return url;
    return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${id}&modestbranding=1&rel=0&iv_load_policy=3&playsinline=1&enablejsapi=1`;
}

// --- 📱 مسارات واجهة العميل العامة (Public Customer API) ---
app.get('/api/sync', async (req, res) => {
    try {
        const cats = await Category.find({});
        const prods = await Product.find({});
        res.json({ success: true, categories: cats, prods: prods });
    } catch(e) { res.status(500).json({ success: false }); }
});

app.post('/api/auth/register', async (req, res) => {
    const { name, phone, pass } = req.body;
    try {
        const exist = await User.findOne({ phone });
        if (exist) return res.json({ success: false, msg: "❌ رقم الهاتف مسجل مسبقاً!" });
        const newUser = await new User({ name, phone, pass }).save();
        res.json({ success: true, user: newUser });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/auth/login', async (req, res) => {
    const { phone, pass } = req.body;
    try {
        const user = await User.findOne({ phone, pass });
        if (!user) return res.json({ success: false, msg: "❌ رقم الهاتف أو كلمة المرور خاطئة!" });
        res.json({ success: true, user });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/user/profile', async (req, res) => {
    const { phone } = req.body;
    try {
        const user = await User.findOne({ phone });
        if (!user) return res.json({ success: false });
        res.json({ success: true, user });
    } catch(e) { res.status(500).json({ success: false }); }
});

app.post('/api/order/submit', async (req, res) => {
    const { phone, items, total } = req.body;
    try {
        const user = await User.findOne({ phone });
        if(!user || user.bal < total) return res.json({ success: false, msg: "⚠️ رصيد محفظتك غير كافٍ لإتمام الفاتورة!" });
        user.bal -= total;
        await user.save();
        const id = "INV-" + Math.floor(100000 + Math.random() * 900000);
        await new Order({ id, phone, items, total }).save();
        res.json({ success: true, msg: "✅ تم سحب الرصيد واعتماد الفاتورة بنجاح!" });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/order/game-topup', async (req, res) => {
    const { phone, gameId, playerId, denomName, price } = req.body;
    try {
        const user = await User.findOne({ phone });
        if(!user || user.bal < price) return res.json({ success: false, msg: "⚠️ الرصيد الحالي بالمحفظة غير كافٍ للشحن!" });
        user.bal -= price;
        await user.save();
        const id = "GAME-" + Math.floor(100000 + Math.random() * 900000);
        await new Order({ 
            id, 
            phone, 
            items: [{ name: `شحن ${gameId === 'pubg_mobile' ? 'ببجي' : 'فري فاير'} [ ${denomName} ] لـ ID: ${playerId}` }], 
            total: price, 
            status: 'مكتمل ✅' 
        }).save();
        res.json({ success: true, msg: "⚡ تم شحن الـ ID تلقائياً وخصم القيمة من المحفظة!" });
    } catch(e) { res.status(500).json({ success: false }); }
});

app.post('/api/orders/history', async (req, res) => {
    const { phone } = req.body;
    try {
        const list = await Order.find({ phone }).sort({ _id: -1 });
        res.json({ success: true, orders: list });
    } catch(e) { res.status(500).json({ success: false }); }
});

app.post('/api/messages/history', async (req, res) => {
    const { phone } = req.body;
    try {
        const list = await Message.find({ $or: [{ receiver: phone }, { receiver: "ALL" }] }).sort({ _id: -1 });
        res.json({ success: true, messages: list });
    } catch(e) { res.status(500).json({ success: false }); }
});

app.post('/api/messages/send-support', async (req, res) => {
    const { sender, body } = req.body;
    try {
        await new Message({ sender, receiver: "ADMIN", title: "📩 رسالة دعم فني داخلي", body }).save();
        res.json({ success: true });
    } catch(e) { res.status(500).json({ success: false }); }
});

app.get('/api/ads/active', async (req, res) => {
    try {
        const ad = await Ad.findOne({ active: true });
        res.json({ success: true, ad });
    } catch(e) { res.status(500).json({ success: false }); }
});

// --- 👑 مسارات لوحة التحكم الإدارية المركزية (Admin Dashboard API) ---
app.post('/api/admin/dashboard', async (req, res) => {
    const { adminPass } = req.body;
    if (adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        const orders = await Order.find({}).sort({ _id: -1 });
        const users = await User.find({}).sort({ _id: -1 });
        const clientMessages = await Message.find({ receiver: "ADMIN" }).sort({ _id: -1 });
        const ads = await Ad.find({});
        res.json({ success: true, data: { orders, users, clientMessages, ads } });
    } catch(e) { res.status(500).json({ success: false }); }
});

app.post('/api/admin/order/update-status', async (req, res) => {
    const { adminPass, id, status } = req.body;
    if (adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        await Order.updateOne({ id }, { status });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/admin/user/update-balance', async (req, res) => {
    const { adminPass, phone, newBalance } = req.body;
    if (adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        await User.updateOne({ phone }, { bal: Number(newBalance) });
        await new Message({
            sender: "ADMIN",
            receiver: phone,
            title: "💰 تحديث وإيداع في المحفظة الرقمية",
            body: `مرحباً، تم شحن/تحديث رصيد محفظتك المعتمدة بنجاح من قبل الإدارة. الرصيد الحالي الجديد: [ ${newBalance} YER ]`
        }).save();
        res.json({ success: true });
    } catch(e) { res.status(500).json({ success: false }); }
});

app.post('/api/messages/send', async (req, res) => {
    const { adminPass, receiver, title, body } = req.body;
    if (adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        await new Message({ sender: "ADMIN", receiver, title, body }).save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/admin/ad/add', async (req, res) => {
    const { adminPass, videoUrl } = req.body;
    if (adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        const embedLink = makeEmbedUrl(videoUrl);
        await Ad.updateMany({}, { active: false }); 
        await new Ad({ videoUrl: embedLink, active: true }).save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/admin/category/add', async (req, res) => {
    const { adminPass, name, sub, img } = req.body;
    if (adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        const safeImg = fixGoogleImageUrl(img); // التنظيف الآمن للصورة
        await new Category({ name, sub, img: safeImg }).save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/admin/product/add', async (req, res) => {
    const { adminPass, name, price, img, cat } = req.body;
    if (adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        const safeImg = fixGoogleImageUrl(img); // التنظيف الآمن للصورة
        await new Product({ name, price: Number(price), img: safeImg, cat }).save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/admin/category/delete', async (req, res) => {
    const { adminPass, name } = req.body;
    if (adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        await Category.deleteOne({ name });
        res.json({ success: true });
    } catch(e) { res.status(500).json({ success: false }); }
});

app.post('/api/admin/product/delete', async (req, res) => {
    const { adminPass, name } = req.body;
    if (adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        await Product.deleteOne({ name });
        res.json({ success: true });
    } catch(e) { res.status(500).json({ success: false }); }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`🚀 خوادم التموينات تعمل بكفاءة على منفذ: ${PORT}`));

