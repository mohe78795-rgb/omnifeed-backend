const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// إعدادات الوسيط (Middleware)
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// الاتصال بقاعدة البيانات
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ متصل بنجاح بقاعدة بيانات أبو حسين"))
    .catch(err => console.error("❌ خطأ في الاتصال:", err));

// --- 🗃️ تعريف النماذج (Models) ---

const User = mongoose.model('User', new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    pass: { type: String, required: true },
    bal: { type: Number, default: 0 },
    joinDate: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) }
}));

const Category = mongoose.model('Category', new mongoose.Schema({
    name: String,
    sub: String,
    img: String
}));

const Product = mongoose.model('Product', new mongoose.Schema({
    name: String,
    price: Number,
    img: String,
    cat: String
}));

const Order = mongoose.model('Order', new mongoose.Schema({
    id: { type: String, default: () => "INV-" + Math.floor(100000 + Math.random() * 900000) },
    phone: String,
    items: Array,
    total: Number,
    status: { type: String, default: 'قيد المراجعة ⏳' },
    date: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) }
}));

const Message = mongoose.model('Message', new mongoose.Schema({
    sender: String,   // رقم الهاتف للعميل أو "ADMIN"
    receiver: String, // رقم الهاتف للعميل أو "ADMIN" أو "ALL"
    title: String,
    body: String,
    date: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) }
}));

const Ad = mongoose.model('Ad', new mongoose.Schema({
    videoUrl: String,
    active: { type: Boolean, default: true }
}));

const ADMIN_KEY = process.env.ADMIN_SECRET_KEY || "123456";

// --- 🛠️ وظائف مساعدة ---
// تحويل روابط يوتيوب العادية إلى Embed لتعمل في المشغل
function makeEmbedUrl(url) {
    if (!url) return "";
    let regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    let match = url.match(regExp);
    if (match && match[2].length == 11) {
        return "https://www.youtube.com/embed/" + match[2];
    }
    return url;
}

// ==========================================
// 🌐 1️⃣ مسارات واجهة العميل (Customer Routes)
// ==========================================

app.get('/api/categories', async (req, res) => res.json(await Category.find({})));
app.get('/api/products', async (req, res) => res.json(await Product.find({})));

// جلب الإعلان النشط من قاعدة البيانات
app.get('/api/ads', async (req, res) => {
    try {
        const ads = await Ad.find({ active: true }).sort({ _id: -1 });
        res.json(ads);
    } catch (e) { res.status(500).json([]); }
});

// نظام الدردشة: جلب الرسائل الخاصة بالعميل
app.get('/api/messages/:phone', async (req, res) => {
    try {
        const messages = await Message.find({
            $or: [ { receiver: req.params.phone }, { receiver: 'ALL' }, { sender: req.params.phone } ]
        }).sort({ _id: 1 });
        res.json(messages);
    } catch (e) { res.status(500).json([]); }
});

// إرسال رسالة من العميل للإدارة
app.post('/api/messages/user-send', async (req, res) => {
    try {
        const msg = new Message({ sender: req.body.sender, receiver: 'ADMIN', title: 'رسالة عميل', body: req.body.body });
        await msg.save();
        res.json({ success: true });
    } catch(e) { res.status(500).json({ success: false }); }
});

// الحسابات
app.post('/api/auth/signup', async (req, res) => {
    const { name, phone, pass } = req.body;
    try {
        if (await User.findOne({ phone })) return res.json({ success: false, message: "رقم الهاتف مسجل مسبقاً" });
        const u = new User({ name, phone, pass }); await u.save();
        res.json({ success: true, user: u });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const u = await User.findOne({ phone: req.body.phone, pass: req.body.pass });
        res.json(u ? { success: true, user: u } : { success: false, message: "بيانات الدخول خاطئة" });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/auth/user/:phone', async (req, res) => {
    const u = await User.findOne({ phone: req.params.phone });
    res.json(u ? { success: true, user: u } : { success: false });
});

// الطلبات
app.post('/api/orders/add', async (req, res) => {
    try {
        const u = await User.findOne({ phone: req.body.phone });
        if (!u || u.bal < req.body.order.total) return res.status(400).json({ success: false, message: "رصيدك غير كافٍ" });
        u.bal -= req.body.order.total; await u.save();
        const o = new Order({ phone: req.body.phone, items: req.body.order.items, total: req.body.order.total });
        await o.save();
        res.json({ success: true, currentBal: u.bal });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/orders/:phone', async (req, res) => res.json(await Order.find({ phone: req.params.phone }).sort({ _id: -1 })));

// شحن الألعاب
app.get('/api/games', (req, res) => {
    res.json({ success: true, game_list: [
        { game_code: "pubg", game_name: "ببجي موبايل", denominations: [{ id: "uc_60", name: "60 شدة", price: 1200 }, { id: "uc_325", name: "325 شدة", price: 5800 }] },
        { game_code: "ff", game_name: "فري فاير", denominations: [{ id: "dia_100", name: "100 جوهرة", price: 950 }, { id: "dia_210", name: "210 جوهرة", price: 1900 }] }
    ]});
});

app.post('/api/games/topup', async (req, res) => {
    const { phone, price, game_code, user_id } = req.body;
    try {
        const u = await User.findOne({ phone });
        if (!u || u.bal < price) return res.json({ success: false, message: "رصيد المحفظة غير كافٍ" });
        u.bal -= price; await u.save();
        await new Message({ receiver: phone, title: "نجاح الشحن ⚡", body: `تم شحن ${game_code} بنجاح للآيدي ${user_id}` }).save();
        res.json({ success: true, currentBal: u.bal });
    } catch(e) { res.status(500).json({ success: false }); }
});

// ==========================================
// 💼 2️⃣ مسارات لوحة التحكم (Admin Routes)
// ==========================================

// جلب بيانات لوحة التحكم بالكامل
app.post('/api/admin/dashboard', async (req, res) => {
    if (req.body.adminPass !== ADMIN_KEY) return res.status(401).json({ success: false });
    try {
        res.json({ success: true, data: {
            orders: await Order.find({}).sort({ _id: -1 }),
            users: await User.find({}).sort({ _id: -1 }),
            categories: await Category.find({}),
            products: await Product.find({}),
            ads: await Ad.find({})
        }});
    } catch (e) { res.status(500).json({ success: false }); }
});

// إدارة الرصيد
app.post('/api/admin/user/update-balance', async (req, res) => {
    if (req.body.adminPass !== ADMIN_KEY) return res.status(401).json({ success: false });
    try {
        const user = await User.findOneAndUpdate({ phone: req.body.phone }, { bal: req.body.newBalance }, { new: true });
        await new Message({ receiver: req.body.phone, title: "تحديث رصيد 💰", body: `تم تحديث رصيدك. الرصيد الحالي: ${req.body.newBalance} YER` }).save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// إدارة حالات الطلب
app.post('/api/admin/order/update-status', async (req, res) => {
    if (req.body.adminPass !== ADMIN_KEY) return res.status(401).json({ success: false });
    try {
        await Order.findOneAndUpdate({ id: req.body.id }, { status: req.body.status });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// إضافة إعلان فيديو جديد (يتم تخزينه في قاعدة البيانات)
app.post('/api/admin/ad/add', async (req, res) => {
    if (req.body.adminPass !== ADMIN_KEY) return res.status(401).json({ success: false });
    try {
        const finalUrl = makeEmbedUrl(req.body.videoUrl);
        await Ad.updateMany({}, { active: false }); // تعطيل الإعلانات القديمة
        const newAd = new Ad({ videoUrl: finalUrl, active: true });
        await newAd.save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// إدارة الأقسام
app.post('/api/admin/category/add', async (req, res) => {
    if (req.body.adminPass !== ADMIN_KEY) return res.status(401).json({ success: false });
    const cat = new Category(req.body); await cat.save();
    res.json({ success: true });
});

app.post('/api/admin/category/delete', async (req, res) => {
    if (req.body.adminPass !== ADMIN_KEY) return res.status(401).json({ success: false });
    await Category.findOneAndDelete({ name: req.body.name });
    res.json({ success: true });
});

// إدارة المنتجات
app.post('/api/admin/product/add', async (req, res) => {
    if (req.body.adminPass !== ADMIN_KEY) return res.status(401).json({ success: false });
    const prod = new Product(req.body); await prod.save();
    res.json({ success: true });
});

app.post('/api/admin/product/delete', async (req, res) => {
    if (req.body.adminPass !== ADMIN_KEY) return res.status(401).json({ success: false });
    await Product.findOneAndDelete({ name: req.body.name });
    res.json({ success: true });
});

// إرسال رسائل برقية (للكل أو لفرد)
app.post('/api/messages/send', async (req, res) => {
    if (req.body.adminPass !== ADMIN_KEY) return res.status(401).json({ success: false });
    const msg = new Message({ sender: 'ADMIN', receiver: req.body.receiver, title: req.body.title, body: req.body.body });
    await msg.save();
    res.json({ success: true });
});

// تشغيل السيرفر
app.listen(PORT, () => {
    console.log(`🚀 منظومة أبو حسين تعمل على المنفذ ${PORT}`);
});
