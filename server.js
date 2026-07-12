const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const axios = require('axios');
const FormData = require('form-data');
const crypto = require('crypto');
// ─── [تعديل 1] استيراد وتجهيز FIREBASE ───
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// 🛠️ إعدادات الوسائط (Middleware)
// ==========================================
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// 🗄️ الاتصال بقاعدة البيانات (MongoDB)
// ==========================================
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://mohe78795_db_user:737465252@cluster0.qr9q8iv.mongodb.net/abu_hussein_db?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ متصل بقاعدة البيانات (MongoDB)"))
    .catch(err => console.error("❌ خطأ في الاتصال بقاعدة البيانات:", err));

// ==========================================
// 🗃️ تعريف موديلات قاعدة البيانات (Schemas & Models)
// ==========================================

// ─── [تعديل 2] جدول تخزين رموز الأجهزة الخاصة بالإشعارات ───
const DeviceToken = mongoose.model('DeviceToken', new mongoose.Schema({
    phone: { type: String, required: true }, // لربط الهاتف بالجهاز
    token: { type: String, required: true, unique: true },
    date: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) }
}));

const User = mongoose.model('User', new mongoose.Schema({
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
    id: { type: String, default: () => "INV-" + Math.floor(100000 + Math.random() * 900000) },
    phone: String,
    items: Array,
    total: Number,
    status: { type: String, default: 'قيد المراجعة ⏳' },
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

const Transaction = mongoose.model('Transaction', new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    phone: String,
    type: { type: String, default: 'game' },
    targetId: { type: String, required: true },
    serviceId: { type: String, required: true },
    serviceName: { type: String, required: true },
    price: Number,
    referenceId: { type: String, unique: true },
    megaOrderId: { type: String, default: null },
    status: { type: String, default: 'قيد التنفيذ ⏳' },
    errorCode: String,
    date: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) }
}));

// ==========================================
// 📣 دالة مساعدة لإرسال الإشعارات الفورية (FCM)
// ==========================================
async function sendPushNotification(targetPhone, title, body) {
    try {
        // البحث عن جميع الرموز المسجلة لهذا رقم الهاتف (قد يكون مسجل في أكثر من جهاز)
        const devices = await DeviceToken.find({ phone: targetPhone });
        if (!devices || devices.length === 0) return;

        const tokens = devices.map(d => d.token);

        const message = {
            notification: { title, body },
            tokens: tokens
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`🔔 [إشعار] تم دفع الإشعار بنجاح إلى (${response.successCount}) جهاز.`);
    } catch (error) {
        console.error("❌ خطأ أثناء إرسال الإشعار الفوري عبر Firebase:", error.message);
    }
}

// ==========================================
// 🔑 إعدادات ربط منظومة ميجا سنتر (V1.3)
// ==========================================
const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || "123456";
const MEGA_USERNAME = 'u_4082361957';
const MEGA_API_KEY = 'trrC6caLfhvod3HPxTE5ND9Ld6wvdsa5jm1Nlq2GrNdD7';
const MEGA_URL = 'https://megatec-center.com/api/rest.php';

const getMegaAuthHeader = () => {
    const authString = Buffer.from(`${MEGA_USERNAME}:${MEGA_API_KEY}`).toString('base64');
    return { 'Authorization': `Basic ${authString}` };
};

const getMegaErrorMessage = (code) => {
    const errors = {
        '400': 'طلب غير مكتمل أو مفقود',
        '401': 'خطأ في التوثيق - يرجى مراجعة مفاتيح الربط',
        '404': 'الخدمة غير موجودة حالياً',
        '405': 'رصيد الوكيل في ميجا سنتر لا يكفي',
        '410': 'رقم المعرف (ID) غير صحيح أو الخدمة متوقفة عليه',
        '412': 'رقم المرجع (Reference) مستخدم مسبقاً',
        '413': 'السعر المرسل لا يطابق السعر الحالي (Price Check Error)',
        '429': 'طلبات كثيرة جداً - يرجى المحاولة بعد قليل',
        '500': 'خطأ داخلي في سيرفر المزود'
    };
    return errors[String(code)] || `خطأ غير معروف برمز: ${code}`;
};

function makeEmbedUrl(url) {
    if (!url) return "";
    let regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    let match = url.match(regExp);
    return (match && match[2].length == 11) ? "https://www.youtube.com/embed/" + match[2] : url;
}

// ==========================================
// 🌐 1️⃣ مسارات العميل (المتجر والمستخدمين)
// ==========================================

// ─── [تعديل 3] مسار استقبال وحفظ الـ Token القادم من الأندرويد ───
app.post('/api/register-token', async (req, res) => {
    const { token, user_id } = req.body; // الـ user_id هنا يمثل رقم هاتف المستخدم المرسل من دالة أندرويد
    if (!token || !user_id) return res.status(400).json({ success: false, message: "بيانات ناقصة" });

    try {
        // تحديث الرمز أو إنشائه إن لم يكن موجوداً
        await DeviceToken.findOneAndUpdate(
            { token: token },
            { phone: user_id, token: token },
            { upsert: true, new: true }
        );
        console.log(`📱 [نظام] تم تسجيل رمز جهاز جديد للهاتف: ${user_id}`);
        res.json({ success: true, message: "تم تسجيل جهازك في نظام الإشعارات" });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.get('/api/categories', async (req, res) => {
    try { res.json(await Category.find({})); } catch (e) { res.status(500).json([]); }
});

app.get('/api/products', async (req, res) => {
    try { res.json(await Product.find({})); } catch (e) { res.status(500).json([]); }
});

app.get('/api/ads', async (req, res) => {
    try { res.json(await Ad.find({ active: true }).sort({ _id: -1 })); } catch (e) { res.status(500).json([]); }
});

app.post('/api/auth/signup', async (req, res) => {
    const { name, phone, pass } = req.body;
    try {
        const exist = await User.findOne({ phone });
        if (exist) return res.json({ success: false, message: "رقم الهاتف مسجل مسبقاً!" });
        const newUser = new User({ name, phone, pass, bal: 0 });
        await newUser.save();
        res.json({ success: true, user: newUser });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/auth/login', async (req, res) => {
    const { phone, pass } = req.body;
    try {
        const user = await User.findOne({ phone, pass });
        if (!user) return res.json({ success: false, message: "بيانات الدخول خاطئة" });
        res.json({ success: true, user });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/auth/user/:phone', async (req, res) => {
    try {
        const user = await User.findOne({ phone: req.params.phone });
        res.json({ success: !!user, user });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/orders/add', async (req, res) => {
    const { phone, order } = req.body;
    try {
        const user = await User.findOne({ phone });
        if (!user || user.bal < order.total) return res.status(400).json({ success: false, message: "رصيدك غير كافٍ" });
        user.bal -= order.total;
        await user.save();
        const newOrder = new Order({ phone, items: order.items, total: order.total });
        await newOrder.save();
        
        // ─── [تعديل 4] إشعار فوري عند إنشاء طلب متجر ───
        sendPushNotification(phone, "تم استلام طلبك 📦", `خصم ${order.total} YER. طلبك قيد المراجعة حالياً.`);

        res.json({ success: true, currentBal: user.bal });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/orders/:phone', async (req, res) => {
    try { res.json(await Order.find({ phone: req.params.phone }).sort({ _id: -1 })); } catch (e) { res.status(500).json([]); }
});

app.get('/api/messages/:phone', async (req, res) => {
    try {
        const messages = await Message.find({ $or: [{ receiver: req.params.phone }, { receiver: 'ALL' }] }).sort({ _id: -1 });
        res.json(messages);
    } catch (e) { res.status(500).json([]); }
});

// ==========================================
// 🕹️ 2️⃣ مسارات ميجا سنتر (شحن الألعاب والسداد)
// ==========================================

let cachedServices = null;
let lastFetchTime = 0;

app.get('/api/games', async (req, res) => {
    const currentTime = Date.now();
    if (cachedServices && (currentTime - lastFetchTime < 15 * 60 * 1000)) {
        return res.json({ success: true, game_list: cachedServices, from_cache: true });
    }

    const form = new FormData();
    form.append('request', 'servicelist');

    try {
        const response = await axios.post(MEGA_URL, form, {
            headers: { ...form.getHeaders(), ...getMegaAuthHeader() },
            timeout: 15000
        });

        if (response.data && (response.data.status === true || response.data.status === "true")) {
            cachedServices = response.data.ServiceList || [];
            lastFetchTime = currentTime;
            return res.json({ success: true, game_list: cachedServices });
        }

        if (cachedServices) {
            return res.json({ success: true, game_list: cachedServices, note: "بيانات مؤقتة" });
        }
        res.json({ success: false, message: "فشل تحديث قائمة الخدمات" });
    } catch (e) {
        if (cachedServices) {
            return res.json({ success: true, game_list: cachedServices, note: "بيانات مؤقتة بسبب خطأ اتصال" });
        }
        res.status(500).json({ success: false, message: "خطأ اتصال مع سيرفر الشحن" });
    }
});

app.post('/api/games/topup', async (req, res) => {
    const { phone, price, serviceId, serviceName, user_id, type } = req.body;

    if (!phone || !price || !serviceId || !user_id) return res.status(400).json({ success: false, message: "بيانات ناقصة" });

    const user = await User.findOne({ phone });
    if (!user || user.bal < Number(price)) return res.json({ success: false, message: "رصيدك الحالي غير كافٍ" });

    user.bal -= Number(price);
    await user.save();

    const referenceId = 'TMN-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    const newTxn = new Transaction({
        userId: user._id, phone, type: type || 'game',
        targetId: user_id, serviceId, serviceName, price: Number(price), referenceId
    });
    await newTxn.save();

    const form = new FormData();
    form.append('request', 'neworder');
    form.append('service', String(serviceId));
    form.append('reference', referenceId);
    form.append('player_id', String(user_id));
    form.append('price_check', String(price));

    try {
        const response = await axios.post(MEGA_URL, form, {
            headers: { ...form.getHeaders(), ...getMegaAuthHeader() },
            timeout: 30000
        });

        const data = response.data;

        if (data && (data.status === true || data.status === "true")) {
            newTxn.status = 'ناجحة ✅';
            newTxn.megaOrderId = data.orderid;
            await newTxn.save();

            const nTitle = "نجاح الشحن الفوري ⚡";
            const nBody = `تم تنفيذ طلب ${serviceName} للرقم ${user_id} بنجاح.`;

            await new Message({ receiver: phone, title: nTitle, body: nBody }).save();
            
            // ─── [تعديل 5] إشعار فوري عند نجاح الشحن التلقائي ───
            sendPushNotification(phone, nTitle, nBody);

            return res.json({ success: true, currentBal: user.bal, orderId: data.orderid });
        } else {
            const errorMsg = getMegaErrorMessage(data.code);
            newTxn.status = 'فاشلة ❌';
            newTxn.errorCode = data.code;
            await newTxn.save();

            user.bal += Number(price);
            await user.save();

            return res.json({ success: false, message: errorMsg });
        }
    } catch (e) {
        console.error("Critical Network Error:", e.message);
        newTxn.status = 'معلقة (تحقق يدوي) ⚠️';
        newTxn.errorCode = 'TIMEOUT_ERROR';
        await newTxn.save();

        return res.json({ success: false, message: "العملية قيد المعالجة، يرجى عدم تكرار الطلب ومراجعة السجل بعد دقائق." });
    }
});

// ==========================================
// 🌐 4️⃣ مسار استقبال تحديثات العمليات (Webhook)
// ==========================================
app.post('/api/mega-webhook', async (req, res) => {
    const { reference, orderid, status, result } = req.body;
    console.log(`📥 تحديث ويب هوك مستلم للعملية المرجعية: ${reference}, الحالة: ${status}`);

    try {
        const txn = await Transaction.findOne({ referenceId: reference });
        if (!txn) return res.status(404).json({ success: false, message: "العملية غير موجودة" });

        if (txn.status !== 'معلقة (تحقق يدوي) ⚠️' && txn.status !== 'قيد التنفيذ ⏳') {
            return res.json({ success: true, message: "العملية محدثة مسبقاً" });
        }

        if (String(status) === '1') {
            txn.status = 'ناجحة ✅';
            txn.megaOrderId = orderid;
            await txn.save();

            const nTitle = "نجاح الشحن ⚡";
            const nBody = `تم تنفيذ طلبك بنجاح. ${result || ''}`;
            await new Message({ receiver: txn.phone, title: nTitle, body: nBody }).save();
            
            // ─── [تعديل 6] إشعار فوري عبر الويب هوك عند اكتمال العملية المعلقة ───
            sendPushNotification(txn.phone, nTitle, nBody);

        } else if (String(status) === '0') {
            txn.status = 'فاشلة ❌';
            txn.megaOrderId = orderid;
            await txn.save();

            const user = await User.findById(txn.userId);
            if (user) {
                user.bal += txn.price;
                await user.save();

                const nTitle = "إلغاء العملية وإعادة الرصيد ↩️";
                const nBody = `تم رفض عملية الشحن لـ ${txn.serviceName}. السبب: ${result || 'غير محدد'}. تم إعادة مبلغ ${txn.price} إلى حسابك.`;
                
                await new Message({ receiver: txn.phone, title: nTitle, body: nBody }).save();
                
                // ─── [تعديل 7] إشعار فوري بفشل الشحن وإرجاع الرصيد ───
                sendPushNotification(txn.phone, nTitle, nBody);
            }
        }
        res.json({ success: true });
    } catch (error) {
        console.error("❌ خطأ في معالجة الويب هوك:", error.message);
        res.status(500).json({ success: false });
    }
});

// ==========================================
// 💼 3️⃣ مسارات لوحة التحكم (Admin)
// ==========================================

app.post('/api/admin/dashboard', async (req, res) => {
    const { adminPass } = req.body;
    if (adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        const [orders, users, categories, products, ads, txns] = await Promise.all([
            Order.find({}).sort({ _id: -1 }),
            User.find({}).sort({ _id: -1 }),
            Category.find({}),
            Product.find({}),
            Ad.find({ active: true }).sort({ _id: -1 }),
            Transaction.find({}).sort({ _id: -1 })
        ]);
        res.json({ success: true, data: { orders, users, categories, products, ads, txns } });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/admin/user/update-balance', async (req, res) => {
    const { adminPass, phone, newBalance } = req.body;
    if (adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        const user = await User.findOneAndUpdate({ phone }, { bal: Number(newBalance) }, { new: true });
        if(user) {
            const nTitle = "تحديث الرصيد 💰";
            const nBody = `تم تعديل رصيد حسابك. رصيدك الحالي: ${newBalance} YER`;
            
            await new Message({ receiver: phone, title: nTitle, body: nBody }).save();
            
            // ─── [تعديل 8] إشعار فوري للمستخدم عند تعديل رصيده يدوياً من الأدمن ───
            sendPushNotification(phone, nTitle, nBody);
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/admin/order/update-status', async (req, res) => {
    const { adminPass, id, status } = req.body;
    if (adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        const order = await Order.findOneAndUpdate({ id }, { status }, { new: true });
        if (order) {
            // إرسال إشعار للعميل بتحديث حالة طلبه
            sendPushNotification(order.phone, "تحديث حالة الطلب 📦", `طلبك رقم ${id} أصبح: ${status}`);
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/messages/send', async (req, res) => {
    const { adminPass, receiver, title, body } = req.body;
    if (adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        await new Message({ receiver, title, body }).save();
        
        // ─── [تعديل 9] إشعار عند إرسال رسالة مخصصة أو عامة للجميع ───
        if (receiver === 'ALL') {
            // إذا كانت الرسالة عامة، نرسلها لكل المسجلين في الإشعارات
            const allDevices = await DeviceToken.find({});
            const tokens = allDevices.map(d => d.token);
            if (tokens.length > 0) {
                await admin.messaging().sendEachForMulticast({ notification: { title, body }, tokens });
            }
        } else {
            sendPushNotification(receiver, title, body);
        }

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
        await new Category({ name, sub, img }).save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/admin/product/add', async (req, res) => {
    const { adminPass, name, price, img, cat } = req.body;
    if (adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        await new Product({ name, price: Number(price), img, cat }).save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ==========================================
// 🚀 بدء التشغيل
// ==========================================
app.listen(PORT, () => {
    console.log(`🚀 السيرفر يعمل بنجاح على المنفذ ${PORT}`);
    console.log(`🔗 الربط الحالي: Mega Center API V1.3`);
});
