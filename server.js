const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ⚡ أهم سطر لعمل الروابط على Render: تعريف مجلد الملفات
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ متصل بقاعدة بيانات أبو حسين المركزية"))
    .catch(err => console.error("❌ خطأ الاتصال:", err));

// --- 🗃️ النماذج (Models) ---
const User = mongoose.model('User', new mongoose.Schema({
    name: String, phone: { type: String, unique: true }, pass: String, bal: { type: Number, default: 0 },
    joinDate: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) }
}));
const Category = mongoose.model('Category', new mongoose.Schema({ name: String, sub: String, img: String }));
const Product = mongoose.model('Product', new mongoose.Schema({ name: String, price: Number, img: String, cat: String }));
const Order = mongoose.model('Order', new mongoose.Schema({
    id: { type: String, default: () => "INV-" + Math.floor(100000 + Math.random() * 900000) },
    phone: String, items: Array, total: Number, status: { type: String, default: 'قيد المراجعة ⏳' },
    date: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) }
}));
const Message = mongoose.model('Message', new mongoose.Schema({
    sender: String, receiver: String, title: String, body: String,
    date: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) }
}));
const Ad = mongoose.model('Ad', new mongoose.Schema({ videoUrl: String, active: { type: Boolean, default: true } }));

const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || "123456";

// دالة تحويل روابط يوتيوب (تم إصلاحها)
function makeEmbedUrl(url) {
    if (!url) return "";
    let regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    let match = url.match(regExp);
    if (match && match[2].length == 11) return "https://www.youtube.com/embed/" + match[2];
    return url;
}

// ==========================================
// 🌐 1️⃣ مسارات العميل (Client API)
// ==========================================

app.get('/api/categories', async (req, res) => res.json(await Category.find({})));
app.get('/api/products', async (req, res) => res.json(await Product.find({})));
app.get('/api/ads', async (req, res) => res.json(await Ad.find({ active: true })));

// جلب الدردشة كاملة (بين العميل والآدمن)
app.get('/api/messages/:phone', async (req, res) => {
    const messages = await Message.find({
        $or: [ { receiver: req.params.phone }, { receiver: 'ALL' }, { sender: req.params.phone } ]
    }).sort({ _id: 1 });
    res.json(messages);
});

// إرسال رسالة من العميل للإدارة
app.post('/api/messages/user-send', async (req, res) => {
    try {
        await new Message({ sender: req.body.sender, receiver: 'ADMIN', title: 'رسالة من عميل', body: req.body.body }).save();
        res.json({ success: true });
    } catch(e) { res.status(500).json({ success: false }); }
});

app.post('/api/auth/signup', async (req, res) => {
    const { name, phone, pass } = req.body;
    if (await User.findOne({ phone })) return res.json({ success: false, message: "مسجل مسبقاً" });
    const u = new User({ name, phone, pass, bal: 0 }); await u.save();
    res.json({ success: true, user: u });
});

app.post('/api/auth/login', async (req, res) => {
    const u = await User.findOne({ phone: req.body.phone, pass: req.body.pass });
    res.json(u ? { success: true, user: u } : { success: false, message: "خطأ في البيانات" });
});

app.get('/api/auth/user/:phone', async (req, res) => res.json({ success: true, user: await User.findOne({ phone: req.params.phone }) }));

app.post('/api/orders/add', async (req, res) => {
    const u = await User.findOne({ phone: req.body.phone });
    if (!u || u.bal < req.body.order.total) return res.status(400).json({ success: false });
    u.bal -= req.body.order.total; await u.save();
    await new Order({ phone: req.body.phone, items: req.body.order.items, total: req.body.order.total }).save();
    res.json({ success: true, currentBal: u.bal });
});

app.get('/api/orders/:phone', async (req, res) => res.json(await Order.find({ phone: req.params.phone }).sort({ _id: -1 })));

// ==========================================
// 💼 2️⃣ مسارات الإدارة (Admin API)
// ==========================================

// ⚡ الرابط الذي طلبت إصلاحه:
app.get('/admin', (req, res) => res.sendFile(path.join(publicPath, 'admin.html')));

app.post('/api/admin/dashboard', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    res.json({ success: true, data: {
        orders: await Order.find({}).sort({ _id: -1 }),
        users: await User.find({}).sort({ _id: -1 }),
        categories: await Category.find({}),
        products: await Product.find({}),
        ads: await Ad.find({ active: true })
    }});
});

app.post('/api/admin/ad/add', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    await Ad.updateMany({}, { active: false });
    await new Ad({ videoUrl: makeEmbedUrl(req.body.videoUrl), active: true }).save();
    res.json({ success: true });
});

app.post('/api/admin/user/update-balance', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    await User.findOneAndUpdate({ phone: req.body.phone }, { bal: req.body.newBalance });
    await new Message({ receiver: req.body.phone, title: "تحديث المحفظة 💰", body: `تم تحديث رصيدك إلى: ${req.body.newBalance} YER` }).save();
    res.json({ success: true });
});

app.post('/api/admin/order/update-status', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    await Order.findOneAndUpdate({ id: req.body.id }, { status: req.body.status });
    res.json({ success: true });
});

app.post('/api/messages/send', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    await new Message({ sender: 'ADMIN', receiver: req.body.receiver, title: req.body.title, body: req.body.body }).save();
    res.json({ success: true });
});

// مسارات إضافية للإدارة (حذف وتعديل)
app.post('/api/admin/category/add', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    await new Category(req.body).save(); res.json({ success: true });
});

app.post('/api/admin/product/add', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    await new Product(req.body).save(); res.json({ success: true });
});

app.listen(PORT, () => console.log(`🚀 السيرفر يعمل بنجاح على المنفذ ${PORT}`));
