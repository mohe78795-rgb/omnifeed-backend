const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const admin = require('firebase-admin');
const { credential } = require('firebase-admin'); // استيراد مباشر لضمان الجاهزية
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// --- 2. إعداد Firebase Admin ---
try {
    const serviceAccountPath = "/etc/secrets/service-account.json";
    if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
        
        // استخدام credential المستورد مباشرة للتهيئة
        admin.initializeApp({
            credential: credential.cert(serviceAccount)
        });
        console.log("✅ Firebase Admin Initialized Successfully");
    } else {
        console.log("⚠️ Service account file not found at:", serviceAccountPath);
    }
} catch (e) {
    console.error("❌ Firebase Admin Init Error:", e.message);
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// الاتصال بقاعدة البيانات
const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ متصل بسحابة أبو حسين (MongoDB)"))
    .catch(err => console.error("❌ خطأ في الاتصال بقاعدة البيانات:", err));

// تعريف الموديلات
const User = mongoose.model('User', new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    pass: { type: String, required: true },
    bal: { type: Number, default: 0 },
    fcmToken: { type: String, default: null },
    joinDate: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) }
}));

const Category = mongoose.model('Category', new mongoose.Schema({ name: String, sub: String, img: String }));
const Product = mongoose.model('Product', new mongoose.Schema({ name: String, price: Number, img: String, cat: String }));
const Order = mongoose.model('Order', new mongoose.Schema({ id: { type: String, default: () => "INV-" + Math.floor(100000 + Math.random() * 900000) }, phone: String, items: Array, total: Number, status: { type: String, default: 'قيد المراجعة ⏳' }, date: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) } }));
const Message = mongoose.model('Message', new mongoose.Schema({ sender: { type: String, default: "ADMIN" }, receiver: { type: String, required: true }, title: { type: String, required: true }, body: { type: String, required: true }, date: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) } }));
const Ad = mongoose.model('Ad', new mongoose.Schema({ videoUrl: { type: String, required: true }, active: { type: Boolean, default: true }, date: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) } }));

const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || "123456";

// دالة إرسال الإشعارات
async function sendPushNotification(phone, title, body) {
    try {
        const query = phone === 'ALL' ? {} : { phone };
        const users = await User.find({ ...query, fcmToken: { $ne: null } });
        const tokens = users.map(u => u.fcmToken);

        if (tokens.length > 0) {
            await admin.messaging().sendMulticast({
                notification: { title, body },
                tokens: tokens,
            });
            console.log(`🚀 Sent notification to ${tokens.length} devices`);
        }
    } catch (error) {
        console.error("❌ Error sending notification:", error);
    }
}

// المسارات
app.post('/api/auth/update-fcm', async (req, res) => {
    const { phone, fcmToken } = req.body;
    try { await User.findOneAndUpdate({ phone }, { fcmToken }); res.json({ success: true }); } 
    catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/messages/send', async (req, res) => {
    const { adminPass, receiver, title, body } = req.body;
    if (adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        await new Message({ receiver, title, body }).save();
        sendPushNotification(receiver, title, body);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/categories', async (req, res) => { const c = await Category.find({}); res.json(c); });
app.get('/api/products', async (req, res) => { const p = await Product.find({}); res.json(p); });
app.get('/api/ads', async (req, res) => { const a = await Ad.find({ active: true }).sort({ _id: -1 }); res.json(a); });
app.get('/api/messages/:phone', async (req, res) => { try { const m = await Message.find({ $or: [{ receiver: req.params.phone }, { receiver: 'ALL' }] }).sort({ _id: -1 }); res.json(m); } catch (e) { res.status(500).json([]); } });
app.post('/api/auth/signup', async (req, res) => { const { name, phone, pass } = req.body; try { const exist = await User.findOne({ phone }); if (exist) return res.json({ success: false, message: "رقم الهاتف مسجل مسبقاً!" }); const newUser = new User({ name, phone, pass, bal: 0 }); await newUser.save(); res.json({ success: true, user: newUser }); } catch (e) { res.status(500).json({ success: false }); } });
app.post('/api/auth/login', async (req, res) => { const { phone, pass } = req.body; try { const user = await User.findOne({ phone, pass }); if (!user) return res.json({ success: false, message: "بيانات خاطئة" }); res.json({ success: true, user }); } catch (e) { res.status(500).json({ success: false }); } });
app.get('/api/auth/user/:phone', async (req, res) => { const u = await User.findOne({ phone: req.params.phone }); if (u) res.json({ success: true, user: u }); else res.status(404).json({ success: false }); });
app.post('/api/orders/add', async (req, res) => { const { phone, order } = req.body; try { const user = await User.findOne({ phone }); if (!user || user.bal < order.total) return res.status(400).json({ success: false }); user.bal -= order.total; await user.save(); await new Order({ phone, items: order.items, total: order.total }).save(); res.json({ success: true, currentBal: user.bal }); } catch (e) { res.status(500).json({ success: false }); } });
app.get('/api/orders/:phone', async (req, res) => { const o = await Order.find({ phone: req.params.phone }).sort({ _id: -1 }); res.json(o); });
app.get('/api/games', (req, res) => { res.json({ success: true, game_list: [{ game_code: "pubg_mobile", game_name: "ببجي موبايل", denominations: [{ id: "uc_60", name: "60 UC", price: 1200 }] }] }); });
app.post('/api/games/topup', async (req, res) => {
    const { phone, price, game_code, user_id } = req.body;
    try {
        const user = await User.findOne({ phone });
        if (!user || user.bal < price) return res.json({ success: false });
        user.bal -= Number(price); await user.save();
        await new Message({ receiver: phone, title: "نجاح الشحن ⚡", body: `تم شحن ${game_code} للـ ID: ${user_id}` }).save();
        sendPushNotification(phone, "نجاح الشحن ⚡", `تم شحن ${game_code} للـ ID: ${user_id}`);
        res.json({ success: true, currentBal: user.bal });
    } catch (e) { res.json({ success: false }); }
});

app.listen(PORT, () => console.log(`🚀 منظومة تمويناتي تعمل على ${PORT}`));

