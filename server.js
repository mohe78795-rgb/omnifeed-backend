const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const admin = require('firebase-admin');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// --- إعداد Firebase Admin (الإصدار المستقر 11.11.0) ---
try {
    const serviceAccountPath = "/etc/secrets/service-account.json";
    if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
        
        // هذه الطريقة هي المعيار في الإصدار 11
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log("✅ Firebase Admin Initialized Successfully");
    } else {
        console.warn("⚠️ Warning: service-account.json not found in /etc/secrets/");
    }
} catch (e) {
    console.error("❌ Firebase Initialization Error:", e.message);
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// الاتصال بـ MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ متصل بقاعدة البيانات"))
    .catch(err => console.error("❌ خطأ MongoDB:", err));

// الموديلات الأساسية
const User = mongoose.model('User', new mongoose.Schema({ phone: String, bal: Number, fcmToken: String }));
const Message = mongoose.model('Message', new mongoose.Schema({ receiver: String, title: String, body: String }));

// دالة إرسال الإشعارات (الإصدار 11)
async function sendPushNotification(phone, title, body) {
    try {
        const users = await User.find({ phone: phone === 'ALL' ? { $exists: true } : phone, fcmToken: { $ne: null } });
        const tokens = users.map(u => u.fcmToken);
        if (tokens.length > 0) {
            await admin.messaging().sendMulticast({
                notification: { title, body },
                tokens: tokens,
            });
            console.log(`🚀 Sent notification to ${tokens.length} devices`);
        }
    } catch (e) { console.error("❌ Notification Error:", e.message); }
}

// مسارات API
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

app.post('/api/games/topup', async (req, res) => {
    const { phone, price, game_code, user_id } = req.body;
    try {
        const user = await User.findOne({ phone });
        if (!user || user.bal < price) return res.json({ success: false });
        user.bal -= Number(price);
        await user.save();
        await new Message({ receiver: phone, title: "نجاح الشحن ⚡", body: `تم شحن ${game_code} للـ ID: ${user_id}` }).save();
        sendPushNotification(phone, "نجاح الشحن ⚡", `تم شحن ${game_code} للـ ID: ${user_id}`);
        res.json({ success: true, currentBal: user.bal });
    } catch (e) { res.json({ success: false }); }
});

app.listen(PORT, () => console.log(`🚀 السيرفر يعمل على المنفذ ${PORT}`));

