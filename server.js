const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const axios = require('axios');
const FormData = require('form-data');
const crypto = require('crypto');
const admin = require('firebase-admin');

let serviceAccount;

// قراءة بيانات مفتاح Firebase من متغيرات البيئة أو محلياً
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (err) {
        console.error("❌ خطأ في تحليل نص FIREBASE_SERVICE_ACCOUNT المستلم:", err.message);
    }
} else {
    try {
        serviceAccount = require('./firebase-account-key.json');
    } catch (err) {
        console.warn("⚠️ لم يتم العثور على ملف firebase-account-key.json محلياً.");
    }
}

if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("✅ تم تفعيل خدمة Firebase Admin بنجاح.");
} else {
    console.error("❌ فشل تشغيل Firebase: لا يوجد ملف مفتاح أو متغير بيئة معرّف!");
}

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// 🛠️ إعدادات الوسائط (Middleware)
// ==========================================
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public'))); // تقديم ملفات الإدارة الساكنة

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
const DeviceToken = mongoose.model('DeviceToken', new mongoose.Schema({
    phone: { type: String, required: true },
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
    img: { type: String, default: "" },
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
    imageUrl: { type: String, default: "" }, 
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
    type: { type: String, default: 'game' }, // 'game' أو 'package'
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

const AppSetting = mongoose.model('AppSetting', new mongoose.Schema({
    appName: { type: String, default: "تموينات أبو حسين" },
    maintenanceMode: { type: Boolean, default: false },
    whatsappSupport: { type: String, default: "967737465252" },
    appVersion: { type: String, default: "1.0.0" }
}));

// ==========================================
// 📣 دالة إرسال الإشعارات الفورية (FCM) المحدثة
// ==========================================
async function sendPushNotification(targetPhone, title, body, imageUrl = "") {
    try {
        const devices = await DeviceToken.find({ phone: targetPhone });
        if (!devices || devices.length === 0) return;
        const tokens = devices.map(d => d.token);

        const message = {
            notification: {
                title: title,
                body: body,
                ...(imageUrl && { imageUrl: imageUrl }) 
            },
            data: {
                title: title,
                body: body,
                imageUrl: imageUrl || ""
            },
            android: {
                priority: 'high',
                notification: {
                    channelId: "messages_channel",
                    sound: "default",
                    clickAction: 'OPEN_ACTIVITY_1'
                }
            },
            tokens: tokens
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`🔔 [إشعار] تم دفع الإشعار المحدث بنجاح إلى (${response.successCount}) جهاز.`);
    } catch (error) {
        console.error("❌ خطأ إرسال الإشعار المحدث:", error.message);
    }
}

// ==========================================
// 🗝️ إعدادات ومتغيرات نظام Mega Center
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
        '405': 'رصيد الوكيل لا يكفي',
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
// 💳 إعدادات ودوال نظام أم دراهم (MDarahim API)
// ==========================================
let cachedMdarahimToken = null;

// دالة الدخول التلقائي لتحديث توكن أم دراهم وتخزينه في الذاكرة
async function initializeMdarahimAuth() {
    const url = 'https://www.mdarahim.net/logins';
    const params = new URLSearchParams();
    params.append('username', '780425632');
    params.append('password', '737465252');
    params.append('grant_type', 'password');

    try {
        const response = await axios.post(url, params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 15000
        });
        if (response.data && response.data.access_token) {
            cachedMdarahimToken = response.data.access_token;
            console.log('✅ [أم دراهم] تم تحديث توكن الوصول التلقائي بنجاح.');
        }
    } catch (error) {
        console.error('❌ [أم دراهم] خطأ في تحديث توكن الدخول التلقائي:', error.response ? error.response.data : error.message);
        // إعادة المحاولة بعد دقيقة إذا فشل الاتصال الأول بالسيرفر
        setTimeout(initializeMdarahimAuth, 60000);
    }
}

// جدولة تجديد التوكن تلقائياً كل 23 ساعة بالخلفية
setInterval(initializeMdarahimAuth, 23 * 60 * 60 * 1000);


// ==========================================
// 🌐 مسارات العميل والربط (APIs)
// ==========================================
app.post('/api/register-token', async (req, res) => {
    const { token, user_id } = req.body;
    if (!token || !user_id) return res.status(400).json({ success: false, message: "بيانات ناقصة" });
    try {
        await DeviceToken.findOneAndUpdate({ token }, { phone: user_id, token }, { upsert: true, new: true });
        console.log(`📱 [نظام] تم تسجيل رمز جهاز جديد للهاتف: ${user_id}`);
        res.json({ success: true, message: "تم تسجيل جهازك في نظام الإشعارات" });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
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
        if (!user || user.bal < order.total) return res.status(400).json({ success: false, message: "الرصيد غير كافٍ" });
        user.bal -= order.total;
        await user.save();
        await new Order({ phone, items: order.items, total: order.total }).save();
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
// 🕹️ مسارات ميجا سنتر والويب هوك
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
            headers: { ...form.getHeaders(), ...getMegaAuthHeader() }, timeout: 15000
        });
        if (response.data && (response.data.status === true || response.data.status === "true")) {
            cachedServices = response.data.ServiceList || [];
            lastFetchTime = currentTime;
            return res.json({ success: true, game_list: cachedServices });
        }
        if (cachedServices) return res.json({ success: true, game_list: cachedServices, note: "بيانات مؤقتة" });
        res.json({ success: false, message: "فشل تحديث قائمة الخدمات" });
    } catch (e) {
        if (cachedServices) return res.json({ success: true, game_list: cachedServices, note: "بيانات مؤقتة بسبب خطأ اتصال" });
        res.status(500).json({ success: false, message: "خطأ اتصال مع سيرفر الشحن" });
    }
});

app.post('/api/games/topup', async (req, res) => {
    const { phone, price, serviceId, serviceName, user_id, type } = req.body;
    if (!phone || !price || !serviceId || !user_id) return res.status(400).json({ success: false, message: "بيانات ناقصة" });

    const user = await User.findOne({ phone });
    if (!user || user.bal < Number(price)) return res.json({ success: false, message: "رصيدك غير كافٍ" });

    user.bal -= Number(price);
    await user.save();

    const referenceId = 'TMN-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    const newTxn = new Transaction({
        userId: user._id, phone, type: type || 'game', targetId: user_id, serviceId, serviceName, price: Number(price), referenceId
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
            headers: { ...form.getHeaders(), ...getMegaAuthHeader() }, timeout: 30000
        });
        const data = response.data;
        if (data && (data.status === true || data.status === "true")) {
            newTxn.status = 'ناجحة ✅';
            newTxn.megaOrderId = data.orderid;
            await newTxn.save();

            const nTitle = "نجاح الشحن الفوري ⚡";
            const nBody = `تم تنفيذ طلب ${serviceName} للرقم ${user_id} بنجاح.`;
            await new Message({ receiver: phone, title: nTitle, body: nBody }).save();
            sendPushNotification(phone, nTitle, nBody);

            return res.json({ success: true, currentBal: user.bal, orderId: data.orderid });
        } else {
            user.bal += Number(price);
            await user.save();
            newTxn.status = 'فاشلة ❌';
            newTxn.errorCode = data.code;
            await newTxn.save();
            return res.json({ success: false, message: getMegaErrorMessage(data.code) });
        }
    } catch (e) {
        newTxn.status = 'معلقة (تحقق يدوي) ⚠️';
        newTxn.errorCode = 'TIMEOUT_ERROR';
        await newTxn.save();
        return res.json({ success: false, message: "العملية قيد المعالجة، يرجى عدم تكرار الطلب ومراجعة السجل بعد دقائق." });
    }
});

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
// 📋 مسار جلب خدمات وباقات أم دراهم المطور (المقاوم لوضع النوم)
// ==========================================
let cachedMdarahimServices = null;
let lastMdarahimFetchTime = 0;

app.get('/api/mdarahim/services', async (req, res) => {
    const currentTime = Date.now();

    // 1. إذا كانت البيانات متوفرة في الذاكرة المؤقتة ولم يمر عليها 30 دقيقة، نرسلها فوراً
    if (cachedMdarahimServices && (currentTime - lastMdarahimFetchTime < 30 * 60 * 1000)) {
        return res.json({ success: true, services_list: cachedMdarahimServices, from_cache: true });
    }

    // 2. حل مشكلة الـ null: إذا استيقظ السيرفر وكان التوكن فارغاً، نحاول جلب التوكن فوراً قبل إظهار الخطأ
    if (!cachedMdarahimToken) {
        console.log("⚠️ التوكن غير موجود (احتمال بسبب إقلاع السيرفر)، جاري محاولة جلب توكن سريع...");
        await initializeMdarahimAuth(); // انتظر حتى ينتهي جلب التوكن أولاً
    }

    // 3. التحقق النهائي بعد محاولة التحديث الفورية
    if (!cachedMdarahimToken) {
        if (cachedMdarahimServices) {
            return res.json({ success: true, services_list: cachedMdarahimServices, note: "بيانات مؤقتة - السيرفر فشل في تحديث التوكن حالياً" });
        }
        return res.status(500).json({ success: false, message: "فشل الاتصال بمزود الخدمة. يرجى التحقق من بيانات الحساب أو سجل العمليات (Logs)." });
    }

    // 4. جلب البيانات برمجياً من سيرفر أم دراهم
    try {
        const response = await axios.get('https://www.mdarahim.net/api/ac/v1/getservices', {
            headers: {
                'Authorization': `Bearer ${cachedMdarahimToken}`,
                'Accept': 'application/json'
            },
            timeout: 25000 // رفع المهلة لـ 25 ثانية لتفادي بطء الاستضافة المجانية
        });

        if (response.data) {
            // تخزين البيانات في الذاكرة وتحديث وقت الجلب
            cachedMdarahimServices = response.data;
            lastMdarahimFetchTime = currentTime;

            return res.json({ success: true, services_list: cachedMdarahimServices });
        }

        if (cachedMdarahimServices) return res.json({ success: true, services_list: cachedMdarahimServices, note: "بيانات مؤقتة" });
        res.json({ success: false, message: "فشل تحديث قائمة الخدمات من المزود" });

    } catch (error) {
        console.error('❌ [أم دراهم] خطأ في جلب البيانات:', error.message);

        // إذا انتهت صلاحية التوكن بشكل مفاجئ (Unauthorized)، نصفر التوكن ليعاد جلبه تلقائياً في الطلب القادم
        if (error.response && error.response.status === 401) {
            cachedMdarahimToken = null;
        }

        // في حال حدوث خطأ في الشبكة، إذا كان لدينا نسخة قديمة مخزنة نرسلها للعميل بدلاً من إظهار شاشة بيضاء
        if (cachedMdarahimServices) {
            return res.json({ success: true, services_list: cachedMdarahimServices, note: "بيانات مؤقتة بسبب خطأ اتصال بالشبكة" });
        }
        res.status(500).json({ success: false, message: "خطأ في الاتصال بسيرفر أم دراهم" });
    }
});


app.post('/api/mdarahim/packages', async (req, res) => {
    const { phone, price, serviceId, offerId, actionType, mobileNumber, serviceName } = req.body;
    
    if (!phone || !price || !serviceId || !offerId || !mobileNumber) {
        return res.status(400).json({ success: false, message: "بيانات الطلب ناقصة" });
    }

    // 1. التحقق من رصيد العميل داخل تطبيقك أولاً
    const user = await User.findOne({ phone });
    if (!user || user.bal < Number(price)) {
        return res.json({ success: false, message: "رصيدك الحالي غير كافٍ لتفعيل هذه الباقة" });
    }

    // 2. خصم المبلغ مبدئياً وتوليد المعاملة لحفظ السجل
    user.bal -= Number(price);
    await user.save();

    const referenceId = 'MD-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    const newTxn = new Transaction({
        userId: user._id,
        phone,
        type: 'package', 
        targetId: mobileNumber, 
        serviceId: String(serviceId),
        serviceName: serviceName || 'باقات ومزايا',
        price: Number(price),
        referenceId: referenceId
    });
    await newTxn.save();

    // 3. التحقق من جاهزية توكن الاتصال بأم دراهم
    if (!cachedMdarahimToken) {
        user.bal += Number(price); // إعادة المبلغ للعميل
        await user.save();
        newTxn.status = 'فاشلة ❌';
        newTxn.errorCode = 'TOKEN_MISSING';
        await newTxn.save();
        return res.json({ success: false, message: "جاري تهيئة الاتصال بالمزود، يرجى المحاولة بعد قليل." });
    }

    // 4. إرسال الطلب البرمجي إلى أم دراهم
    try {
        const response = await axios.post('https://www.mdarahim.net/api/ac/v1/do', {
            "AC": 4,                    // كود إجراء الباقات
            "ACT": Number(actionType) || 1, // 1 لإضافة باقة جديدة، 2 للتجديد
            "PSI": Number(serviceId),
            "OFFER_ID": String(offerId),
            "NUM": String(mobileNumber),
            "TRANID": referenceId       // إرسال الرقم المرجعي الفريد لحماية الطلب
        }, {
            headers: {
                'Authorization': `Bearer ${cachedMdarahimToken}`,
                'Content-Type': 'application/json'
            },
            timeout: 35000
        });

        const result = response.data;

        if (result && result.RC === 1) { // نجاح العملية بنجاح كامل
            newTxn.status = 'ناجحة ✅';
            await newTxn.save();

            const nTitle = "نجاح تفعيل الباقة ⚡";
            const nBody = `تم تفعيل ${serviceName || 'الباقة المطلوبة'} للرقم ${mobileNumber} بنجاح.`;
            await new Message({ receiver: phone, title: nTitle, body: nBody }).save();
            sendPushNotification(phone, nTitle, nBody);

            return res.json({ success: true, currentBal: user.bal });

        } else if (result && (result.RC === 2 || result.RC === -1)) { // العملية معلقة في السيرفر
            newTxn.status = 'معلقة (تحقق يدوي) ⚠️';
            await newTxn.save();
            return res.json({ success: false, message: "العملية معلقة لدى المزود، سيتم تحديثها تلقائياً." });

        } else { // فشل الطلب من المزود (مثل رقم غلط أو خدمة متوقفة)، نعيد الرصيد للمستخدم
            user.bal += Number(price);
            await user.save();
            newTxn.status = 'فاشلة ❌';
            newTxn.errorCode = String(result ? result.RC : 'UNKNOWN');
            await newTxn.save();
            return res.json({ success: false, message: result ? result.RD : "تم رفض الطلب من قبل نظام المزود." });
        }

    } catch (error) { // في حالة انقطاع الاتصال أو التايم آوت، نضعها معلقة للمراجعة والتدقيق
        newTxn.status = 'معلقة (تحقق يدوي) ⚠️';
        newTxn.errorCode = 'TIMEOUT_ERROR';
        await newTxn.save();
        return res.json({ success: false, message: "العملية قيد المعالجة الآن، يرجى مراجعة سجل العمليات بعد قليل." });
    }
});


// ==========================================
// 💼 مسارات الإدارة (Admin APIs) لخدمة الواجهة المنفصلة
// ==========================================
app.get('/api/admin/stats', async (req, res) => {
    if (req.query.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ error: "غير مصرح به" });
    res.json({
        productsCount: await Product.countDocuments(),
        usersCount: await User.countDocuments(),
        pendingOrders: await Order.countDocuments({ status: 'قيد المراجعة ⏳' }),
        categoriesCount: await Category.countDocuments()
    });
});

app.get('/api/admin/users', async (req, res) => {
    if (req.query.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ error: "غير مصرح به" });
    const users = await User.find({}).sort({ _id: -1 });
    const result = await Promise.all(users.map(async u => {
        const t = await DeviceToken.findOne({ phone: u.phone });
        return { id: u._id, name: u.name, phone: u.phone, balance: u.bal, joinDate: u.joinDate, token: t ? t.token : null };
    }));
    res.json(result);
});

app.post('/api/admin/users/delete', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    await User.findByIdAndDelete(req.body.id);
    res.json({ success: true });
});

app.post('/api/admin/user/update-balance', async (req, res) => {
    const { adminPass, phone, newBalance } = req.body;
    if (adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        const user = await User.findOneAndUpdate({ phone }, { bal: Number(newBalance) }, { new: true });
        if (user) {
            const nTitle = "تحديث الرصيد 💰";
            const nBody = `تم تعديل رصيد حسابك. رصيدك الحالي: ${newBalance} YER`;
            await new Message({ receiver: phone, title: nTitle, body: nBody }).save();
            sendPushNotification(phone, nTitle, nBody);
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/admin/categories', async (req, res) => {
    if (req.query.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ error: "غير مصرح به" });
    res.json(await Category.find({}).sort({ _id: -1 }));
});

app.post('/api/admin/category/add', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    await new Category({ name: req.body.name, sub: req.body.sub, img: req.body.img }).save();
    res.json({ success: true });
});

app.post('/api/admin/category/delete', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    await Category.findByIdAndDelete(req.body.id);
    res.json({ success: true });
});

app.get('/api/admin/products', async (req, res) => {
    if (req.query.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ error: "غير مصرح به" });
    res.json(await Product.find({}).sort({ _id: -1 }));
});

app.post('/api/admin/products/add', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    await new Product({ name: req.body.name, price: Number(req.body.price), img: req.body.image, cat: req.body.cat }).save();
    res.json({ success: true });
});

app.post('/api/admin/products/delete', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    await Product.findByIdAndDelete(req.body.id);
    res.json({ success: true });
});

app.get('/api/admin/orders', async (req, res) => {
    if (req.query.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ error: "غير مصرح به" });
    res.json(await Order.find({}).sort({ _id: -1 }));
});

app.post('/api/admin/orders/update-status', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    const order = await Order.findOneAndUpdate({ id: req.body.id }, { status: req.body.status }, { new: true });
    if (order) sendPushNotification(order.phone, "تحديث حالة الطلب 📦", `طلبك رقم ${req.body.id} أصبح: ${req.body.status}`);
    res.json({ success: true });
});

app.get('/api/admin/transactions', async (req, res) => {
    if (req.query.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ error: "غير مصرح به" });
    res.json(await Transaction.find({}).sort({ _id: -1 }));
});

app.get('/api/admin/ads', async (req, res) => {
    if (req.query.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ error: "غير مصرح به" });
    res.json(await Ad.find({}).sort({ _id: -1 }));
});

app.post('/api/admin/ad/add', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    const embed = makeEmbedUrl(req.body.videoUrl);
    await Ad.updateMany({}, { active: false });
    await new Ad({ videoUrl: embed, active: true }).save();
    res.json({ success: true });
});

app.post('/api/admin/ad/delete', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    await Ad.findByIdAndDelete(req.body.id);
    res.json({ success: true });
});

app.post('/api/messages/send', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    const { receiver, title, body, imageUrl } = req.body; 

    await new Message({ receiver, title, body, imageUrl: imageUrl || "" }).save();

    if (receiver === 'ALL') {
        const devices = await DeviceToken.find({});
        const tokens = devices.map(d => d.token);
        if (tokens.length > 0) {
            await admin.messaging().sendEachForMulticast({
                notification: {
                    title,
                    body,
                    ...(imageUrl && { imageUrl: imageUrl })
                },
                data: {
                    title,
                    body,
                    imageUrl: imageUrl || ""
                },
                android: {
                    priority: 'high',
                    notification: {
                        channelId: "messages_channel",
                        sound: "default",
                        clickAction: 'OPEN_ACTIVITY_1'
                    }
                },
                tokens
            });
        }
    } else {
        await sendPushNotification(receiver, title, body, imageUrl);
    }
    res.json({ success: true });
});

app.get('/api/admin/tokens', async (req, res) => {
    if (req.query.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ error: "غير مصرح به" });
    res.json(await DeviceToken.find({}).sort({ _id: -1 }));
});

app.get('/api/admin/settings', async (req, res) => {
    if (req.query.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ error: "غير مصرح به" });
    let config = await AppSetting.findOne();
    if (!config) { config = new AppSetting(); await config.save(); }
    res.json(config);
});

app.post('/api/admin/settings/update', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    let config = await AppSetting.findOne();
    if (!config) config = new AppSetting();
    config.appName = req.body.appName;
    config.whatsappSupport = req.body.whatsappSupport;
    config.appVersion = req.body.appVersion;
    config.maintenanceMode = req.body.maintenanceMode;
    await config.save();
    res.json({ success: true });
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ==========================================
// 🚀 بدء تشغيل السيرفر وتفعيل الاتصال التلقائي
// ==========================================
app.listen(PORT, () => {
    console.log(`🚀 السيرفر يعمل بنجاح على المنفذ ${PORT}`);
    console.log(`🔗 الربط الحالي: Mega Center V1.3 & MDarahim API V1.0`);
    
    // تفعيل التحديث التلقائي للتوكن الخاص بأم دراهم فور إقلاع السيرفر
    initializeMdarahimAuth();
});
