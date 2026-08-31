const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const axios = require('axios');
const FormData = require('form-data');
const crypto = require('crypto');
const admin = require('firebase-admin');

// ==========================================
// 🔑 تهيئة خدمات Firebase Admin
// ==========================================
let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (err) {
        console.error("❌ خطأ في تحليل نص FIREBASE_SERVICE_ACCOUNT:", err.message);
    }
} else {
    try {
        serviceAccount = require('./firebase-account-key.json');
    } catch (err) {
        console.warn("⚠️ لم يتم العثور على ملف firebase-account-key.json محلياً.");
    }
}

if (serviceAccount) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log("✅ تم تفعيل خدمة Firebase Admin بنجاح.");
    } catch (err) {
        console.error("❌ خطأ أثناء تهيئة Firebase Admin:", err.message);
    }
} else {
    console.error("❌ فشل تشغيل Firebase: لا يوجد ملف مفتاح أو متغير بيئة معرّف!");
}

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// 🛠️ إعدادات الوسائط (Middleware)
// ==========================================
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// 🗄️ الاتصال بقاعدة البيانات (MongoDB)
// ==========================================
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error("❌ تحذير: لم يتم ضبط MONGO_URI في ملف .env");
} else {
    mongoose.connect(MONGO_URI)
        .then(() => console.log("✅ متصل بقاعدة البيانات (MongoDB)"))
        .catch(err => console.error("❌ خطأ في الاتصال بقاعدة البيانات:", err));
}

// ==========================================
// 🗃️ تعريف الموديلات والمخططات (Schemas)
// ==========================================
const DeviceToken = mongoose.model('DeviceToken', new mongoose.Schema({
    phone: { type: String, required: true },
    token: { type: String, required: true, unique: true },
    date: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) }
}), 'devicetokens');

const User = mongoose.model('User', new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    pass: { type: String, required: true },
    bal: { type: Number, default: 0 },
    joinDate: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) }
}), 'users');

const Category = mongoose.model('Category', new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    sub: String,
    img: String
}), 'categories');

const Product = mongoose.model('Product', new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    img: { type: String, default: "" },
    cat: { type: String, required: true }
}), 'products');

// --- موديل منتجات الكاشير والمخزون ---
const Item = mongoose.model('Item', new mongoose.Schema({
    barcode: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    costPrice: { type: Number, default: 0 },
    packCostPrice: { type: Number, default: 0 },
    price: { type: Number, required: true },
    pcsPerPack: { type: Number, default: 1 },
    totalPacks: { type: Number, default: 0 },
    totalQty: { type: Number, default: 0 },
    soldQty: { type: Number, default: 0 },
    remainingQty: { type: Number, default: 0 }
}, { timestamps: true }), 'items');

const Order = mongoose.model('Order', new mongoose.Schema({
    id: { type: String, unique: true, default: () => "INV-" + Date.now() + Math.floor(100 + Math.random() * 900) },
    phone: String,
    items: Array,
    total: Number,
    status: { type: String, default: 'قيد المراجعة ⏳' },
    date: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) }
}), 'orders');

const Message = mongoose.model('Message', new mongoose.Schema({
    sender: { type: String, default: "ADMIN" },
    receiver: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    imageUrl: { type: String, default: "" },
    date: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) }
}), 'messages');

const Ad = mongoose.model('Ad', new mongoose.Schema({
    videoUrl: { type: String, required: true },
    active: { type: Boolean, default: true },
    date: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) }
}), 'ads');

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
}), 'transactions');

const AppSetting = mongoose.model('AppSetting', new mongoose.Schema({
    appName: { type: String, default: "تموينات أبو حسين" },
    maintenanceMode: { type: Boolean, default: false },
    whatsappSupport: { type: String, default: "967737528057" },
    appVersion: { type: String, default: "1.0.0" }
}), 'appsettings');

// --- موديل باقات نظام الحرابي الجديد ---
const packageSchema = new mongoose.Schema({}, { strict: false, collection: 'packages' });
const Package = mongoose.model('Package', packageSchema);

// ==========================================
// 📦 مسارات إدارة منتجات الكاشير والمخزون (POS Items API)
// ==========================================
app.get('/api/items', async (req, res) => {
    try {
        const items = await Item.find({}).sort({ updatedAt: -1 });
        res.json({ success: true, count: items.length, items });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/items/:barcode', async (req, res) => {
    try {
        const item = await Item.findOne({ barcode: req.params.barcode });
        if (!item) {
            return res.status(404).json({ success: false, message: 'الصنف غير موجود بالمخزن' });
        }
        res.json({ success: true, item });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/items', async (req, res) => {
    try {
        const { barcode, name, costPrice, packCostPrice, price, pcsPerPack, totalPacks } = req.body;

        if (!barcode || !name || price === undefined) {
            return res.status(400).json({ success: false, error: 'يرجى إدخال الباركود، الاسم، وسعر البيع' });
        }

        const incomingQty = parseInt(totalPacks || 0) * parseInt(pcsPerPack || 1);
        let item = await Item.findOne({ barcode });

        if (item) {
            item.name = name;
            item.costPrice = parseFloat(costPrice || 0);
            item.packCostPrice = parseFloat(packCostPrice || 0);
            item.price = parseFloat(price);
            item.pcsPerPack = parseInt(pcsPerPack || 1);
            item.totalPacks += parseInt(totalPacks || 0);
            item.totalQty += incomingQty;
            item.remainingQty += incomingQty;
            await item.save();
        } else {
            item = new Item({
                barcode,
                name,
                costPrice: parseFloat(costPrice || 0),
                packCostPrice: parseFloat(packCostPrice || 0),
                price: parseFloat(price),
                pcsPerPack: parseInt(pcsPerPack || 1),
                totalPacks: parseInt(totalPacks || 0),
                totalQty: incomingQty,
                soldQty: 0,
                remainingQty: incomingQty
            });
            await item.save();
        }

        res.json({ success: true, message: 'تم حفظ الصنف بالمخزن بنجاح', item });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

app.delete('/api/items/:barcode', async (req, res) => {
    try {
        const deletedItem = await Item.findOneAndDelete({ barcode: req.params.barcode });
        if (!deletedItem) {
            return res.status(404).json({ success: false, error: 'الصنف غير موجود' });
        }
        res.json({ success: true, message: 'تم حذف الصنف من المخزن بنجاح' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==========================================
// 📣 دالة إرسال الإشعارات الفورية (FCM)
// ==========================================
async function sendPushNotification(targetPhone, title, body, imageUrl = "") {
    try {
        if (!admin.apps.length) return;

        const devices = await DeviceToken.find({ phone: targetPhone });
        if (!devices || devices.length === 0) return;
        const tokens = devices.map(d => d.token);

        const message = {
            notification: { title, body, ...(imageUrl && { imageUrl }) },
            data: { title, body, imageUrl: imageUrl || "" },
            android: {
                priority: 'high',
                notification: { channelId: "messages_channel", sound: "default", clickAction: 'OPEN_ACTIVITY_1' }
            },
            tokens: tokens
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`🔔 [إشعار] تم إرسال الإشعار بنجاح إلى (${response.successCount}) جهاز.`);

        if (response.failureCount > 0) {
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    const errCode = resp.error?.code;
                    if (errCode === 'messaging/invalid-registration-token' ||
                        errCode === 'messaging/registration-token-not-registered') {
                        DeviceToken.deleteOne({ token: tokens[idx] }).catch(err =>
                            console.error("❌ خطأ في حذف التوكن التالف:", err.message)
                        );
                    }
                }
            });
        }
    } catch (error) {
        console.error("❌ خطأ إرسال الإشعار:", error.message);
    }
}

// ==========================================
// 🗝️ إعدادات ومتغيرات نظام Mega Center للألعاب
// ==========================================
const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || "SECURE_ADMIN_PASS_123";
const MEGA_USERNAME = process.env.MEGA_USERNAME;
const MEGA_API_KEY = process.env.MEGA_API_KEY;
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
        '413': 'السعر المرسل لا يطابق السعر الحالي',
        '429': 'طلبات كثيرة جداً - يرجى المحاولة بعد قليل',
        '500': 'خطأ داخلي في سيرفر المزود'
    };
    return errors[String(code)] || `خطأ غير معروف برمز: ${code}`;
};

function makeEmbedUrl(url) {
    if (!url) return "";
    let regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    let match = url.match(regExp);
    return (match && match[2].length === 11) ? "https://www.youtube.com/embed/" + match[2] : url;
}

// ==========================================
// 🌐 إعدادات ونظام مزود خدمات (الحرابي) الجديد
// ==========================================
const PROVIDER_CONFIG = {
  apiUrl: process.env.PROVIDER_API_URL || "https://alhirabi.yemoney.net/api/yr/",
  userId: process.env.PROVIDER_USER_ID || "7367",
  username: process.env.PROVIDER_USERNAME || "735429057",
  password: process.env.PROVIDER_PASSWORD || "moh737465252"
};

function md5(string) {
  return crypto.createHash('md5').update(string).digest('hex');
}

function generateHirabiToken(transid, mobile) {
  const hashedPass = md5(PROVIDER_CONFIG.password);
  return md5(hashedPass + transid + PROVIDER_CONFIG.username + (mobile || ''));
}

async function sendHirabiRequest(endpoint, params) {
  const transid = Date.now().toString();
  const token = generateHirabiToken(transid, params.mobile);
  const targetUrl = `${PROVIDER_CONFIG.apiUrl}${endpoint}`;

  const requestParams = {
    ...params,
    username: PROVIDER_CONFIG.username,
    token: token,
    transid: transid
  };

  const response = await axios.get(targetUrl, { params: requestParams });
  return { transid, data: response.data };
}

// 1. مسار جلب الباقات المحدث (يقوم بالجلب المباشر من كولكشن mdarahimpackages)
app.get('/api/packages', async (req, res) => {
  try {
    const { provider, numberType, internetType } = req.query;
    const filter = {};
    if (provider) filter.provider = provider;
    if (numberType) filter.numberType = { $in: [numberType, 'الكل'] };
    if (internetType) filter.internetType = { $in: [internetType, 'الكل'] };

    const packages = await mongoose.connection.db.collection('mdarahimpackages').find(filter).toArray();
    return res.status(200).json({ status: true, count: packages.length, data: packages });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
}); } catch (e) { res.status(500).json([]); }
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

app.get('/api/user/:phone', async (req, res) => {
    try {
        const user = await User.findOne({ phone: req.params.phone });
        if (!user) {
            return res.status(404).json({ success: false, message: "المستخدم غير موجود" });
        }
        res.json({ success: true, user });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/orders/add', async (req, res) => {
    const { phone, order } = req.body;
    if (!order || !order.total) return res.status(400).json({ success: false, message: "تفاصيل الطلب ناقصة" });

    const totalAmount = Number(order.total);

    try {
        const user = await User.findOneAndUpdate(
            { phone, bal: { $gte: totalAmount } },
            { $inc: { bal: -totalAmount } },
            { new: true }
        );

        if (!user) return res.status(400).json({ success: false, message: "الرصيد غير كافٍ" });

        await new Order({ phone, items: order.items, total: totalAmount }).save();
        sendPushNotification(phone, "تم استلام طلبك 📦", `خصم ${totalAmount} YER. طلبك قيد المراجعة حالياً.`);
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
// 🕹️ مسارات Mega Center والويب هوك للألعاب
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

    const itemPrice = Number(price);

    try {
        const user = await User.findOneAndUpdate(
            { phone, bal: { $gte: itemPrice } },
            { $inc: { bal: -itemPrice } },
            { new: true }
        );

        if (!user) return res.json({ success: false, message: "رصيدك غير كافٍ" });

        const referenceId = 'TMN-' + crypto.randomBytes(4).toString('hex').toUpperCase();
        const newTxn = new Transaction({
            userId: user._id, phone, type: type || 'game', targetId: user_id, serviceId, serviceName, price: itemPrice, referenceId
        });
        await newTxn.save();

        const form = new FormData();
        form.append('request', 'neworder');
        form.append('service', String(serviceId));
        form.append('reference', referenceId);
        form.append('player_id', String(user_id));
        form.append('price_check', String(itemPrice));

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
                await User.findByIdAndUpdate(user._id, { $inc: { bal: itemPrice } });
                newTxn.status = 'فاشلة ❌';
                newTxn.errorCode = data.code;
                await newTxn.save();
                return res.json({ success: false, message: getMegaErrorMessage(data.code) });
            }
        } catch (e) {
            newTxn.status = 'معلقة (تحقق يدوي) ⚠️';
            newTxn.errorCode = 'TIMEOUT_ERROR';
            await newTxn.save();
            return res.json({ success: false, message: "العملية قيد المعالجة، يرجى مراجعة السجل بعد دقائق." });
        }
    } catch (err) {
        return res.status(500).json({ success: false, message: "خطأ داخلي في النظام" });
    }
});

app.post('/api/mega-webhook', async (req, res) => {
    const { reference, orderid, status, result } = req.body;
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

            const user = await User.findByIdAndUpdate(txn.userId, { $inc: { bal: txn.price } }, { new: true });
            if (user) {
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
// 💼 مسارات لوحة التحكم والإدارة (Admin APIs)
// ==========================================
app.get('/api/admin/stats', async (req, res) => {
    if (req.query.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ error: "غير مصرح به" });
    try {
        res.json({
            productsCount: await Product.countDocuments(),
            itemsCount: await Item.countDocuments(),
            usersCount: await User.countDocuments(),
            pendingOrders: await Order.countDocuments({ status: 'قيد المراجعة ⏳' }),
            categoriesCount: await Category.countDocuments()
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/users', async (req, res) => {
    if (req.query.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ error: "غير مصرح به" });
    try {
        const users = await User.find({}).sort({ _id: -1 });
        const result = await Promise.all(users.map(async u => {
            const t = await DeviceToken.findOne({ phone: u.phone });
            return { id: u._id, name: u.name, phone: u.phone, balance: u.bal, joinDate: u.joinDate, token: t ? t.token : null };
        }));
        res.json(result);
    } catch (e) { res.status(500).json([]); }
});

app.post('/api/admin/users/delete', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        await User.findByIdAndDelete(req.body.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
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
    try { res.json(await Category.find({}).sort({ _id: -1 })); } catch (e) { res.status(500).json([]); }
});

app.post('/api/admin/category/add', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        await new Category({ name: req.body.name, sub: req.body.sub, img: req.body.img }).save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/admin/category/delete', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        await Category.findByIdAndDelete(req.body.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/admin/products', async (req, res) => {
    if (req.query.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ error: "غير مصرح به" });
    try { res.json(await Product.find({}).sort({ _id: -1 })); } catch (e) { res.status(500).json([]); }
});

app.post('/api/admin/products/add', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        await new Product({ name: req.body.name, price: Number(req.body.price), img: req.body.image, cat: req.body.cat }).save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/admin/products/delete', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        await Product.findByIdAndDelete(req.body.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/admin/orders', async (req, res) => {
    if (req.query.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ error: "غير مصرح به" });
    try { res.json(await Order.find({}).sort({ _id: -1 })); } catch (e) { res.status(500).json([]); }
});

app.post('/api/admin/orders/update-status', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        const order = await Order.findOneAndUpdate({ id: req.body.id }, { status: req.body.status }, { new: true });
        if (order) sendPushNotification(order.phone, "تحديث حالة الطلب 📦", `طلبك رقم ${req.body.id} أصبح: ${req.body.status}`);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/admin/transactions', async (req, res) => {
    if (req.query.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ error: "غير مصرح به" });
    try { res.json(await Transaction.find({}).sort({ _id: -1 })); } catch (e) { res.status(500).json([]); }
});

app.get('/api/admin/ads', async (req, res) => {
    if (req.query.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ error: "غير مصرح به" });
    try { res.json(await Ad.find({}).sort({ _id: -1 })); } catch (e) { res.status(500).json([]); }
});

app.post('/api/admin/ad/add', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        const embed = makeEmbedUrl(req.body.videoUrl);
        await Ad.updateMany({}, { active: false });
        await new Ad({ videoUrl: embed, active: true }).save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/admin/ad/delete', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        await Ad.findByIdAndDelete(req.body.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/messages/send', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    const { receiver, title, body, imageUrl } = req.body;

    try {
        await new Message({ receiver, title, body, imageUrl: imageUrl || "" }).save();

        if (receiver === 'ALL') {
            const devices = await DeviceToken.find({});
            const tokens = devices.map(d => d.token);

            if (tokens.length > 0 && admin.apps.length > 0) {
                const chunkSize = 500;
                for (let i = 0; i < tokens.length; i += chunkSize) {
                    const chunk = tokens.slice(i, i + chunkSize);
                    await admin.messaging().sendEachForMulticast({
                        notification: { title, body, ...(imageUrl && { imageUrl }) },
                        data: { title, body, imageUrl: imageUrl || "" },
                        android: {
                            priority: 'high',
                            notification: { channelId: "messages_channel", sound: "default", clickAction: 'OPEN_ACTIVITY_1' }
                        },
                        tokens: chunk
                    });
                }
            }
        } else {
            await sendPushNotification(receiver, title, body, imageUrl);
        }
        res.json({ success: true });
    } catch (error) {
        console.error("❌ خطأ إرسال الإشعارات:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/admin/tokens', async (req, res) => {
    if (req.query.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ error: "غير مصرح به" });
    try { res.json(await DeviceToken.find({}).sort({ _id: -1 })); } catch (e) { res.status(500).json([]); }
});

app.get('/api/admin/settings', async (req, res) => {
    if (req.query.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ error: "غير مصرح به" });
    try {
        let config = await AppSetting.findOne();
        if (!config) { config = new AppSetting(); await config.save(); }
        res.json(config);
    } catch (e) { res.status(500).json({}); }
});

app.post('/api/admin/settings/update', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        let config = await AppSetting.findOne();
        if (!config) config = new AppSetting();
        config.appName = req.body.appName;
        config.whatsappSupport = req.body.whatsappSupport;
        config.appVersion = req.body.appVersion;
        config.maintenanceMode = req.body.maintenanceMode;
        await config.save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ==========================================
// 🚀 بدء تشغيل السيرفر
// ==========================================
app.listen(PORT, () => {
    console.log(`🚀 السيرفر يعمل بنجاح على المنفذ ${PORT}`);
});

