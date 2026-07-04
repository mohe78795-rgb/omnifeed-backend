const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// إعدادات السيرفر
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// الاتصال بـ MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ تم الاتصال بقاعدة بيانات أبو حسين بنجاح"))
    .catch(err => console.error("❌ خطأ في الاتصال بقاعدة البيانات:", err));

// --- 🗃️ تعريف موديلات قاعدة البيانات ---

const User = mongoose.model('User', new mongoose.Schema({
    name: String,
    phone: { type: String, unique: true },
    pass: String,
    bal: { type: Number, default: 0 },
    joinDate: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) }
}));

const Category = mongoose.model('Category', new mongoose.Schema({ name: String, sub: String, img: String }));
const Product = mongoose.model('Product', new mongoose.Schema({ name: String, price: Number, img: String, cat: String }));

const Order = mongoose.model('Order', new mongoose.Schema({
    id: { type: String, default: () => "INV-" + Math.floor(100000 + Math.random() * 900000) },
    phone: String,
    items: Array,
    total: Number,
    status: { type: String, default: 'قيد المراجعة ⏳' },
    date: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) }
}));

const Message = mongoose.model('Message', new mongoose.Schema({
    sender: String,   // "ADMIN" أو رقم هاتف العميل
    receiver: String, // "ADMIN" أو رقم هاتف العميل أو "ALL"
    title: String,
    body: String,
    date: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) }
}));

const Ad = mongoose.model('Ad', new mongoose.Schema({ 
    videoUrl: String, 
    active: { type: Boolean, default: true } 
}));

const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || "123456";

// --- 🛠️ وظيفة معالجة روابط يوتيوب ---
function makeEmbedUrl(url) {
    if (!url) return "";
    let regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    let match = url.match(regExp);
    if (match && match[2].length == 11) return "https://www.youtube.com/embed/" + match[2];
    return url;
}

// --- 🌐 مسارات API العميل ---

app.get('/api/ads', async (req, res) => res.json(await Ad.find({ active: true })));
app.get('/api/categories', async (req, res) => res.json(await Category.find({})));
app.get('/api/products', async (req, res) => res.json(await Product.find({})));

// جلب الدردشة (رسائل العميل + رسائل الإدارة الموجهة له)
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

app.post('/api/auth/signup', async (req, res) => {
    const { name, phone, pass } = req.body;
    if (await User.findOne({ phone })) return res.json({ success: false, message: "رقم الهاتف مسجل!" });
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

// --- 💼 مسارات الإدارة (Admin) ---

// دخول صفحة الإدارة
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

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

// إرسال رسالة من الإدارة لمستخدم معين
app.post('/api/messages/send', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        const msg = new Message({ 
            sender: 'ADMIN', 
            receiver: req.body.receiver, 
            title: req.body.title || 'رسالة إدارية', 
            body: req.body.body 
        });
        await msg.save();
        res.json({ success: true });
    } catch(e) { res.status(500).json({ success: false }); }
});

// إضافة إعلان فيديو وتخزينه في قاعدة البيانات
app.post('/api/admin/ad/add', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        const finalUrl = makeEmbedUrl(req.body.videoUrl);
        await Ad.updateMany({}, { active: false }); // إخفاء الإعلانات السابقة
        const newAd = new Ad({ videoUrl: finalUrl, active: true });
        await newAd.save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/admin/user/update-balance', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    await User.findOneAndUpdate({ phone: req.body.phone }, { bal: req.body.newBalance });
    await new Message({ 
        sender: 'ADMIN', 
        receiver: req.body.phone, 
        title: "تحديث رصيد 💰", 
        body: `تم تحديث رصيد حسابك بنجاح. الرصيد الجديد هو: ${req.body.newBalance} YER` 
    }).save();
    res.json({ success: true });
});

app.post('/api/admin/order/update-status', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    await Order.findOneAndUpdate({ id: req.body.id }, { status: req.body.status });
    res.json({ success: true });
});

app.listen(PORT, () => console.log(`🚀 السيرفر يعمل الآن على المنفذ ${PORT}`));
