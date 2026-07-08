Const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const admin = require('firebase-admin'); // إرسال الإشعارات
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// --- 1. إعداد Firebase Admin ---
try {
    const serviceAccount = require("./serviceAccountKey.json");
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log("✅ Firebase Admin Initialized");
} catch (e) {
    console.log("⚠️ Firebase Admin Key missing: الإشعارات لن تعمل بدون ملف serviceAccountKey.json");
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ متصل بسحابة أبو حسين (MongoDB)"))
    .catch(err => console.error("❌ خطأ في الاتصال بقاعدة البيانات:", err));

// --- 2. تعريف الموديلات (Schemas) ---

const User = mongoose.model('User', new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    pass: { type: String, required: true },
    bal: { type: Number, default: 0 },
    fcmToken: { type: String, default: null }, // حقل التوكين للإشعارات
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
    id: { type: String, default: () => "INV-" + Math.floor(100000 + Math.random() * 900000) },
    phone: String,
    items: Array,
    total: Number,
    status: { type: String, default: 'قيد المراجعة ⏳' },
    paymentMethod: String,
    location: String,
    date: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) }
}));

const Message = mongoose.model('Message', new mongoose.Schema({
    sender: { type: String, default: "ADMIN" },
    receiver: { type: String, required: true }, 
    title: { type: String, required: true },
    body: { type: String, required: true },
    date: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) }
}));

const Ad = mongoose.model('Ad', new mongoose.Schema({
    videoUrl: { type: String, required: true },
    active: { type: Boolean, default: true },
    date: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) }
}));

const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || "123456";

// --- 3. الدوال المساعدة (Utility Functions) ---

// دالة إرسال الإشعار عبر Firebase
async function sendPushNotification(phone, title, body) {
    try {
        const query = phone === 'ALL' ? {} : { phone: phone };
        const users = await User.find({ ...query, fcmToken: { $ne: null } });
        const tokens = users.map(u => u.fcmToken).filter(t => t);

        if (tokens.length > 0) {
            const message = {
                notification: { title, body },
                tokens: tokens,
            };
            await admin.messaging().sendEachForMulticast(message);
            console.log(`🚀 Notification sent to ${tokens.length} devices`);
        }
    } catch (error) {
        console.error("❌ Notification error:", error);
    }
}

function makeEmbedUrl(url) {
    if (!url) return "";
    let regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    let match = url.match(regExp);
    if (match && match[2].length == 11) return "https://www.youtube.com/embed/" + match[2];
    return url;
}

// ==========================================
// 🌐 1️⃣ مسارات العميل (Client APIs)
// ==========================================

app.get('/api/categories', async (req, res) => res.json(await Category.find({})));
app.get('/api/products', async (req, res) => res.json(await Product.find({})));
app.get('/api/ads', async (req, res) => res.json(await Ad.find({ active: true }).sort({ _id: -1 })));

app.get('/api/messages/:phone', async (req, res) => {
    const messages = await Message.find({ $or: [{ receiver: req.params.phone }, { receiver: 'ALL' }] }).sort({ _id: -1 });
    res.json(messages);
});

app.post('/api/auth/signup', async (req, res) => {
    const { name, phone, pass } = req.body;
    const exist = await User.findOne({ phone });
    if (exist) return res.json({ success: false, message: "الرقم مسجل مسبقاً" });
    const newUser = new User({ name, phone, pass });
    await newUser.save();
    res.json({ success: true, user: newUser });
});

app.post('/api/auth/login', async (req, res) => {
    const { phone, pass } = req.body;
    const user = await User.findOne({ phone, pass });
    if (!user) return res.json({ success: false, message: "بيانات خاطئة" });
    res.json({ success: true, user });
});

app.get('/api/auth/user/:phone', async (req, res) => {
    const user = await User.findOne({ phone: req.params.phone });
    res.json(user ? { success: true, user } : { success: false });
});

// تحديث توكين الإشعارات للعميل
app.post('/api/auth/update-fcm', async (req, res) => {
    const { phone, fcmToken } = req.body;
    await User.findOneAndUpdate({ phone }, { fcmToken });
    res.json({ success: true });
});

app.post('/api/orders/add', async (req, res) => {
    const { phone, order } = req.body;
    const user = await User.findOne({ phone });
    if (order.paymentMethod === 'دفع محفظة') {
        if (!user || user.bal < order.total) return res.status(400).json({ success: false, message: "رصيد غير كافٍ" });
        user.bal -= order.total;
        await user.save();
    }
    const newOrder = new Order({ phone, ...order });
    await newOrder.save();
    res.json({ success: true, currentBal: user.bal });
});

app.get('/api/orders/:phone', async (req, res) => res.json(await Order.find({ phone: req.params.phone }).sort({ _id: -1 })));

// ==========================================
// 🕹️ 2️⃣ مسارات الألعاب (Games API)
// ==========================================

app.get('/api/games', (req, res) => {
    res.json({
        success: true,
        game_list: [
            {
                game_code: "pubg_mobile",
                game_name: "ببجي موبايل - PUBG",
                denominations: [{ id: "uc_60", name: "60 UC", price: 1200 }, { id: "uc_325", name: "325 UC", price: 5800 }]
            },
            {
                game_code: "free_fire",
                game_name: "فري فاير - Free Fire",
                denominations: [{ id: "dia_100", name: "100 جوهرة", price: 950 }]
            }
        ]
    });
});

app.post('/api/games/validate-user', (req, res) => {
    res.json({ success: true, player_name: "لاعب تمويناتي (" + req.body.user_id + ")" });
});

app.post('/api/games/topup', async (req, res) => {
    const { phone, price, game_code, user_id } = req.body;
    const user = await User.findOne({ phone });
    if (!user || user.bal < price) return res.json({ success: false, message: "رصيد غير كافٍ" });
    
    user.bal -= Number(price);
    await user.save();

    const title = "نجاح الشحن التلقائي ⚡";
    const body = `تم شحن ${game_code} لمعرفك ${user_id} بنجاح.`;
    
    await new Message({ receiver: phone, title, body }).save();
    sendPushNotification(phone, title, body); // إرسال إشعار فوري

    res.json({ success: true, currentBal: user.bal });
});

// ==========================================
// 💼 3️⃣ مسارات لوحة التحكم (Admin APIs)
// ==========================================

app.post('/api/admin/dashboard', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    const orders = await Order.find({}).sort({ _id: -1 });
    const users = await User.find({}).sort({ _id: -1 });
    const categories = await Category.find({});
    const products = await Product.find({});
    const ads = await Ad.find({ active: true });
    res.json({ success: true, data: { orders, users, categories, products, ads } });
});

app.post('/api/admin/user/update-balance', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    const user = await User.findOneAndUpdate({ phone: req.body.phone }, { bal: Number(req.body.newBalance) }, { new: true });
    if (user) {
        const title = "تحديث المحفظة 💰";
        const body = `تم تعديل رصيدك. رصيدك الحالي: ${req.body.newBalance} YER`;
        await new Message({ receiver: user.phone, title, body }).save();
        sendPushNotification(user.phone, title, body);
    }
    res.json({ success: true });
});

app.post('/api/admin/order/update-status', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    const order = await Order.findOneAndUpdate({ id: req.body.id }, { status: req.body.status }, { new: true });
    if (order) {
        const title = "تحديث حالة الطلب 📦";
        const body = `طلبك رقم ${order.id} أصبح الآن: ${req.body.status}`;
        sendPushNotification(order.phone, title, body);
    }
    res.json({ success: true });
});

app.post('/api/messages/send', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    const { receiver, title, body } = req.body;
    await new Message({ receiver, title, body }).save();
    sendPushNotification(receiver, title, body); // إرسال الإشعار
    res.json({ success: true });
});

app.post('/api/admin/ad/add', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    await Ad.updateMany({}, { active: false });
    await new Ad({ videoUrl: makeEmbedUrl(req.body.videoUrl) }).save();
    res.json({ success: true });
});

app.post('/api/admin/category/add', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    await new Category(req.body).save();
    res.json({ success: true });
});

app.post('/api/admin/product/add', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    await new Product(req.body).save();
    res.json({ success: true });
});

app.listen(PORT, () => console.log(`🚀 منظومة تمويناتي تعمل على منفذ ${PORT}`));


