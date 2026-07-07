const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const admin = require('firebase-admin');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// --- 2. إعداد Firebase Admin (الحل المباشر) ---
try {
    // نستخدم مسار الملف الذي يوفره Render لـ Secret Files
    const serviceAccountPath = "/etc/secrets/service-account.json";
    
    if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
        
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log("✅ Firebase Admin Initialized Successfully");
    } else {
        console.error("❌ ERROR: File not found at /etc/secrets/service-account.json");
    }
} catch (e) {
    console.error("❌ Firebase Init Error:", e.message);
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// الاتصال بـ MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ متصل بسحابة أبو حسين (MongoDB)"))
    .catch(err => console.error("❌ خطأ MongoDB:", err));

// تعريف الموديلات
const User = mongoose.model('User', new mongoose.Schema({ name: String, phone: { type: String, unique: true }, pass: String, bal: { type: Number, default: 0 }, fcmToken: String }));
const Message = mongoose.model('Message', new mongoose.Schema({ receiver: String, title: String, body: String }));
const Order = mongoose.model('Order', new mongoose.Schema({ phone: String, items: Array, total: Number }));
const Ad = mongoose.model('Ad', new mongoose.Schema({ videoUrl: String, active: { type: Boolean, default: true } }));

// دالة الإشعارات
async function sendPushNotification(phone, title, body) {
    try {
        const query = phone === 'ALL' ? {} : { phone };
        const users = await User.find({ ...query, fcmToken: { $ne: null } });
        const tokens = users.map(u => u.fcmToken);
        if (tokens.length > 0) {
            await admin.messaging().sendMulticast({ notification: { title, body }, tokens });
            console.log(`🚀 Sent notification to ${tokens.length} devices`);
        }
    } catch (e) { console.error("❌ Notification Error:", e.message); }
}

// المسارات الأساسية
app.post('/api/auth/update-fcm', async (req, res) => {
    const { phone, fcmToken } = req.body;
    await User.findOneAndUpdate({ phone }, { fcmToken });
    res.json({ success: true });
});

app.post('/api/messages/send', async (req, res) => {
    const { adminPass, receiver, title, body } = req.body;
    if (adminPass !== (process.env.ADMIN_SECRET_KEY || "123456")) return res.status(401).json({ success: false });
    await new Message({ receiver, title, body }).save();
    sendPushNotification(receiver, title, body);
    res.json({ success: true });
});

// باقي المسارات
app.get('/api/categories', async (req, res) => res.json([]));
app.get('/api/products', async (req, res) => res.json([]));
app.get('/api/ads', async (req, res) => res.json(await Ad.find({ active: true })));
app.post('/api/auth/signup', async (req, res) => { const user = new User(req.body); await user.save(); res.json({ success: true }); });
app.post('/api/auth/login', async (req, res) => { const user = await User.findOne(req.body); res.json({ success: !!user, user }); });
app.post('/api/orders/add', async (req, res) => { await new Order(req.body).save(); res.json({ success: true }); });
app.get('/api/orders/:phone', async (req, res) => res.json(await Order.find({ phone: req.params.phone })));

app.listen(PORT, () => console.log(`🚀 منظومة تمويناتي تعمل على ${PORT}`));

