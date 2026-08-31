const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const axios = require('axios');
const bcrypt = require('bcrypt');
const jwt = require('jwt-simple');
const rateLimit = require('express-rate-limit');
const admin = require('firebase-admin');
const FormData = require('form-data');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'optomax_card_secret_key_2026';
const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || "SECURE_ADMIN_PASS_123";

// ==========================================
// 🔑 1. تهيئة خدمات Firebase Admin
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
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        console.log("✅ تم تفعيل خدمة Firebase Admin بنجاح.");
    } catch (err) {
        console.error("❌ خطأ أثناء تهيئة Firebase Admin:", err.message);
    }
} else {
    console.error("❌ فشل تشغيل Firebase: لا يوجد ملف مفتاح أو متغير بيئة معرّف!");
}

// ==========================================
// 🛠️ 2. إعدادات الوسائط (Middleware) والتقييد
// ==========================================
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate Limiter لمنع الإغراق على OTP
const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { status: 'error', message: 'تجاوزت الحد المسموح من الطلبات، يرجى المحاولة لاحقاً' }
});

// Middleware للتحقق من الـ JWT للمستخدمين
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'غير مصرح: يجب توفير توكن الجلسة' });
    }

    try {
        const decoded = jwt.decode(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ success: false, message: 'التوكن غير صالح أو انتهت صلاحيته' });
    }
};

// Middleware للتحقق من صلاحية مسؤول النظام (Admin)
const authenticateAdmin = (req, res, next) => {
    const adminKey = req.headers['x-admin-secret'] || req.headers['x-admin-pass'] || req.query.adminKey || req.query.adminPass || req.body.adminKey || req.body.adminPass;
    if (adminKey && adminKey === ADMIN_SECRET_KEY) {
        next();
    } else {
        res.status(403).json({ success: false, message: 'غير مصرح: مفتاح الأدمن غير صحيح' });
    }
};

// ==========================================
// 🗄️ 3. الاتصال بقاعدة البيانات (MongoDB)
// ==========================================
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/optomax_card';

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ تم الاتصال بقاعدة البيانات MongoDB بنجاح'))
    .catch((err) => console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err));

// ==========================================
// 🗃️ 4. تعريف النماذج والمخططات (Schemas)
// ==========================================

const userSchema = new mongoose.Schema({
    fullName: { type: String, default: "" },
    name: { type: String },
    phone: { type: String, required: true, unique: true },
    pass: { type: String },
    password: { type: String, default: null },
    accountStatus: { type: String, enum: ['verified', 'unverified'], default: 'unverified' },
    
    // بيانات الحساب الموثق
    businessActivity: { type: String, default: null },
    address: { type: String, default: null },
    distributorId: { type: String, default: null },
    docType: { type: String, enum: ['identity', 'passport', 'family', 'commercial', null], default: null },
    docFront: { type: String, default: null },
    docBack: { type: String, default: null },

    // الماليات والتواريخ
    bal: { type: Number, default: 0 },
    isPhoneVerified: { type: Boolean, default: false },
    joinDate: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) },
    createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', function(next) {
    if (!this.fullName && this.name) this.fullName = this.name;
    if (!this.name && this.fullName) this.name = this.fullName;
    next();
});

const User = mongoose.model('User', userSchema, 'users');

const otpSchema = new mongoose.Schema({
    phone: { type: String, required: true, unique: true },
    code: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }
});

const OTP = mongoose.model('OTP', otpSchema, 'otps');

const DeviceToken = mongoose.model('DeviceToken', new mongoose.Schema({
    phone: { type: String, required: true },
    token: { type: String, required: true, unique: true },
    date: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) }
}), 'devicetokens');

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

const Order = mongoose.model('Order', new mongoose.Schema({
    id: { type: String, unique: true, default: () => "INV-" + Date.now() + Math.floor(100 + Math.random() * 900) },
    phone: String,
    items: Array,
    total: Number,
    status: { type: String, default: 'قيد المراجعة ⏳' },
    date: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) }
}), 'orders');

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

const Message = mongoose.model('Message', new mongoose.Schema({
    sender: { type: String, default: "ADMIN" },
    receiver: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    imageUrl: { type: String, default: "" },
    date: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) }
}), 'messages');

const AppSetting = mongoose.model('AppSetting', new mongoose.Schema({
    appName: { type: String, default: "تموينات أبو حسين" },
    maintenanceMode: { type: Boolean, default: false },
    whatsappSupport: { type: String, default: "967737528057" },
    appVersion: { type: String, default: "1.0.0" }
}), 'appsettings');

const MdarahimPackage = mongoose.model('MdarahimPackage', new mongoose.Schema({}, { strict: false }), 'mdarahimpackages');

// ==========================================
// 📁 5. إعداد Multer ومعالجة صور التوثيق
// ==========================================
const uploadDir = path.join(__dirname, 'uploads/documents');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('يرجى رفع صور فقط!'), false);
    }
});

const deleteUploadedFiles = (files) => {
    if (!files) return;
    Object.keys(files).forEach(key => {
        files[key].forEach(file => {
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        });
    });
};

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
// 🔐 6. مسارات التوثيق والحسابات (Auth & Profile APIs)
// ==========================================

// أ) إرسال رمز OTP
app.post('/api/send-otp', otpLimiter, async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) return res.status(400).json({ status: 'error', message: 'رقم الهاتف مطلوب' });

        const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        await OTP.findOneAndUpdate(
            { phone },
            { code: generatedOtp, expiresAt },
            { upsert: true, new: true }
        );

        console.log(`📱 [OTP Sent] Phone: ${phone} | Code: ${generatedOtp}`);

        res.status(200).json({ status: 'success', message: 'تم إرسال رمز التحقق بنجاح' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'فشل إرسال رمز التحقق' });
    }
});

// ب) التحقق والتسجيل
app.post('/api/verify-and-register', upload.fields([
    { name: 'docFront', maxCount: 1 },
    { name: 'docBack', maxCount: 1 }
]), async (req, res) => {
    try {
        const { phone, otp, fullName, accountStatus, businessActivity, address, distributorId, docType, password } = req.body;

        if (!phone || !otp || !fullName || !accountStatus) {
            deleteUploadedFiles(req.files);
            return res.status(400).json({ status: 'error', message: 'بيانات التسجيل الأساسية ناقصة' });
        }

        const otpRecord = await OTP.findOne({ phone, code: otp });
        if (!otpRecord || new Date() > otpRecord.expiresAt) {
            deleteUploadedFiles(req.files);
            return res.status(400).json({ status: 'error', message: 'رمز التحقق غير صحيح أو انتهت صلاحيته' });
        }

        let docFrontPath = req.files?.docFront?.[0] ? `/uploads/documents/${req.files.docFront[0].filename}` : null;
        let docBackPath = req.files?.docBack?.[0] ? `/uploads/documents/${req.files.docBack[0].filename}` : null;

        const userData = { fullName, name: fullName, phone, accountStatus, isPhoneVerified: true };

        if (accountStatus === 'verified') {
            userData.businessActivity = businessActivity || null;
            userData.address = address || null;
            userData.distributorId = distributorId || null;
            userData.docType = docType || null;
            userData.docFront = docFrontPath;
            userData.docBack = docBackPath;
        }

        if (password) {
            const salt = await bcrypt.genSalt(10);
            userData.password = await bcrypt.hash(password, salt);
            userData.pass = password;
        }

        const newUser = await User.findOneAndUpdate({ phone }, userData, { upsert: true, new: true });
        await OTP.deleteOne({ phone });

        const token = jwt.encode({ id: newUser._id, phone: newUser.phone }, JWT_SECRET);

        res.status(200).json({
            status: 'success',
            message: 'تم التسجيل وتوثيق الحساب بنجاح',
            token,
            user: {
                id: newUser._id,
                fullName: newUser.fullName || newUser.name,
                phone: newUser.phone,
                accountStatus: newUser.accountStatus,
                bal: newUser.bal
            }
        });
    } catch (error) {
        deleteUploadedFiles(req.files);
        res.status(500).json({ status: 'error', message: 'حدث خطأ أثناء حفظ بيانات الحساب' });
    }
});

// التسجيل السريع الأصلي
app.post('/api/auth/signup', async (req, res) => {
    const { name, phone, pass } = req.body;
    try {
        const exist = await User.findOne({ phone });
        if (exist) return res.json({ success: false, message: "رقم الهاتف مسجل مسبقاً!" });
        const newUser = new User({ name, fullName: name, phone, pass, bal: 0 });
        await newUser.save();
        res.json({ success: true, user: newUser });
    } catch (e) { res.status(500).json({ success: false }); }
});

// ج) تسجيل الدخول
app.post('/api/login', async (req, res) => {
    try {
        const { usernameOrPhone, password } = req.body;
        if (!usernameOrPhone || !password) {
            return res.status(400).json({ status: 'error', message: 'يرجى إدخال رقم الهاتف وكلمة المرور' });
        }

        const user = await User.findOne({ phone: usernameOrPhone });
        if (!user) return res.status(404).json({ status: 'error', message: 'الحساب غير موجود' });

        if (user.password) {
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) return res.status(400).json({ status: 'error', message: 'كلمة المرور غير صحيحة' });
        } else if (user.pass && user.pass !== password) {
            return res.status(400).json({ status: 'error', message: 'كلمة المرور غير صحيحة' });
        }

        const token = jwt.encode({ id: user._id, phone: user.phone }, JWT_SECRET);

        res.status(200).json({
            status: 'success',
            message: 'تم تسجيل الدخول بنجاح',
            token,
            user: {
                id: user._id,
                fullName: user.fullName || user.name,
                phone: user.phone,
                accountStatus: user.accountStatus,
                bal: user.bal
            }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'خطأ في سيرفر تسجيل الدخول' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { phone, pass } = req.body;
    try {
        const user = await User.findOne({ phone });
        if (!user) return res.json({ success: false, message: "بيانات الدخول خاطئة" });
        if (user.password) {
            const isMatch = await bcrypt.compare(pass, user.password);
            if (!isMatch) return res.json({ success: false, message: "بيانات الدخول خاطئة" });
        } else if (user.pass !== pass) {
            return res.json({ success: false, message: "بيانات الدخول خاطئة" });
        }
        res.json({ success: true, user });
    } catch (e) { res.status(500).json({ success: false }); }
});

// د) جلب بيانات الملف الشخصي
app.get('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });

        res.json({
            success: true,
            user: {
                id: user._id,
                fullName: user.fullName || user.name,
                phone: user.phone,
                bal: user.bal,
                accountStatus: user.accountStatus,
                businessActivity: user.businessActivity,
                address: user.address,
                isPhoneVerified: user.isPhoneVerified
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'خطأ في جلب بيانات الملف الشخصي' });
    }
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

// ==========================================
// 💳 7. مسارات خدمات الشحن (أم دراهم)
// ==========================================

let cachedMdarahimToken = null;
const MDARAHIM_BASE_URL = 'https://mdarahim.app';

async function fetchMdarahimToken() {
    try {
        const username = process.env.MDARAHIM_USERNAME;
        const password = process.env.MDARAHIM_PASSWORD;
        if (!username || !password) return null;

        const params = new URLSearchParams();
        params.append('username', username);
        params.append('password', password);
        params.append('grant_type', 'password');

        const loginResponse = await axios.post(`${MDARAHIM_BASE_URL}/logins`, params.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 25000
        });

        if (loginResponse.data?.access_token) {
            cachedMdarahimToken = loginResponse.data.access_token;
            console.log("✅ [أم دراهم] تم جلب التوكن التلقائي بنجاح.");
            return cachedMdarahimToken;
        }
        return null;
    } catch (error) {
        console.error("❌ [أم دراهم] فشل جلب التوكن:", error.message);
        return null;
    }
}

app.post('/api/admin/mdarahim/update-token', authenticateAdmin, async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: "يرجى إرسال التوكن" });

    cachedMdarahimToken = token.trim();
    return res.json({ success: true, message: "تم تحديث توكن أم دراهم بنجاح!" });
});

app.get('/api/admin/mdarahim/balance', authenticateAdmin, async (req, res) => {
    try {
        if (!cachedMdarahimToken) await fetchMdarahimToken();
        if (!cachedMdarahimToken) return res.status(500).json({ success: false, message: "تعذر الحصول على توكن أم دراهم" });

        const response = await axios.get(`${MDARAHIM_BASE_URL}/api/ac/v1/getbalance`, {
            headers: { 'Authorization': `Bearer ${cachedMdarahimToken}`, 'Accept': 'application/json' },
            timeout: 20000
        });

        return res.json({ success: true, balanceData: response.data });
    } catch (error) {
        return res.status(500).json({ success: false, message: "حدث خطأ أثناء الاستعلام عن رصيد أم دراهم", error: error.message });
    }
});

app.post('/api/mdarahim/packages', async (req, res) => {
    const { phone, price, serviceId, offerId, psi, PSI, mobileNumber, serviceName, act, ACT, actionType, AC } = req.body;
    const targetPhoneOrNumber = mobileNumber || req.body.number;
    const finalServiceId = offerId || serviceId;

    if (!phone || !finalServiceId || !targetPhoneOrNumber) {
        return res.status(400).json({ success: false, message: "بيانات الطلب ناقصة" });
    }

    const itemPrice = price ? Number(price) : 0;

    try {
        let user = null;
        if (itemPrice > 0) {
            user = await User.findOneAndUpdate(
                { phone, bal: { $gte: itemPrice } },
                { $inc: { bal: -itemPrice } },
                { new: true }
            );

            if (!user) return res.json({ success: false, message: "رصيدك الحالي غير كافٍ" });
        } else {
            user = await User.findOne({ phone });
        }

        const referenceId = Math.floor(10000000 + Math.random() * 90000000).toString();

        const newTxn = new Transaction({
            userId: user ? user._id : null,
            phone,
            type: 'package',
            targetId: String(targetPhoneOrNumber),
            serviceId: String(finalServiceId),
            serviceName: serviceName || 'باقات أم دراهم',
            price: itemPrice,
            referenceId
        });
        await newTxn.save();

        if (!cachedMdarahimToken) await fetchMdarahimToken();

        const payload = {
            "AC": Number(AC || 1),
            "ACT": Number(ACT || act || actionType || 1),
            "PSI": Number(psi || PSI || 7),
            "NUM": String(targetPhoneOrNumber),
            "OFFER_ID": String(finalServiceId),
            "TRANID": referenceId,
            ...(itemPrice > 0 && { "AMT": itemPrice })
        };

        let response;
        try {
            response = await axios.post(`${MDARAHIM_BASE_URL}/api/ac/v1/do`, payload, {
                headers: {
                    'Authorization': `Bearer ${cachedMdarahimToken}`,
                    'Content-Type': 'application/json'
                },
                timeout: 45000
            });
        } catch (apiErr) {
            if (apiErr.response && apiErr.response.status === 401) {
                await fetchMdarahimToken();
                response = await axios.post(`${MDARAHIM_BASE_URL}/api/ac/v1/do`, payload, {
                    headers: {
                        'Authorization': `Bearer ${cachedMdarahimToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 45000
                });
            } else {
                throw apiErr;
            }
        }

        const result = response.data;
        if (result && (Number(result.RC) === 1 || result.status === true || result.status === "true")) {
            newTxn.status = 'تم التنفيذ بنجاح ✅';
            await newTxn.save();

            const nTitle = "نجاح عملية التسديد ⚡";
            const nBody = `تم شحن وتسديد ${serviceName || 'الخدمة'} للرقم ${targetPhoneOrNumber} بنجاح.`;
            await new Message({ receiver: phone, title: nTitle, body: nBody }).save();
            sendPushNotification(phone, nTitle, nBody);

            return res.json({ success: true, currentBal: user ? user.bal : 0, data: result, transaction: newTxn });
        } else {
            if (user && itemPrice > 0) {
                await User.findByIdAndUpdate(user._id, { $inc: { bal: itemPrice } });
            }
            newTxn.status = 'فشلت العملية ❌';
            newTxn.errorCode = String(result ? result.RC : 'UNKNOWN');
            await newTxn.save();

            let failureMsg = result ? (result.RD || result.message || "رفض الطلب من المزود") : "استجابة غير صالحة";
            return res.json({ success: false, message: failureMsg, providerDetails: result });
        }

    } catch (error) {
        res.status(500).json({ success: false, message: "حدث خطأ أثناء تنفيذ عملية الشحن", error: error.message });
    }
});

app.post('/api/mdarahim/action', async (req, res) => {
    if (!req.body || !req.body.AC) return res.status(400).json({ success: false, message: "بيانات الطلب غير مكتملة" });

    try {
        if (!cachedMdarahimToken) await fetchMdarahimToken();
        const response = await axios.post(`${MDARAHIM_BASE_URL}/api/ac/v1/do`, req.body, {
            headers: { 'Authorization': `Bearer ${cachedMdarahimToken}`, 'Content-Type': 'application/json' },
            timeout: 35000
        });
        return res.json({ success: true, result: response.data });
    } catch (error) {
        return res.status(500).json({ success: false, message: "حدث خطأ أثناء الاتصال بسيرفر أم دراهم", error: error.message });
    }
});

app.get('/api/packages', async (req, res) => {
    try {
        const dbPackages = await MdarahimPackage.find({}).sort({ price: 1 });
        const formattedPackages = dbPackages.map(pkg => {
            const doc = pkg._doc || pkg;
            let netKey = 'YM';
            const provider = (doc.provider || '').toLowerCase();
            const typeStr = (doc.type || '').toLowerCase();
            const serviceName = (doc.serviceName || '').toLowerCase();

            if (provider.includes('you') || typeStr.includes('you') || typeStr.includes('يو') || serviceName.includes('يو')) netKey = 'YOU';
            else if (provider.includes('saba') || typeStr.includes('saba') || typeStr.includes('سبأفون') || serviceName.includes('سبأفون')) netKey = 'SABA';
            else if (provider.includes('wye') || typeStr.includes('واي') || serviceName.includes('واي')) netKey = 'WYE';
            else if (provider.includes('tele') || typeStr.includes('ثابت')) netKey = 'TELE';

            return {
                _id: doc._id,
                serviceId: doc.offerId || doc.serviceId,
                title: doc.name,
                price: doc.price,
                psi: doc.psi || 46,
                net: netKey,
                provider: doc.provider || '',
                numberType: doc.numberType || '',
                type: doc.type || '',
                internetType: doc.internetType || ''
            };
        });

        return res.status(200).json({ success: true, count: formattedPackages.length, packages: formattedPackages });
    } catch (error) {
        return res.status(500).json({ success: false, message: "حدث خطأ أثناء قراءة البيانات", error: error.message });
    }
});

// ==========================================
// 🕹️ 8. مسارات ميجا سنتر (Mega Center API)
// ==========================================

const MEGA_USERNAME = process.env.MEGA_USERNAME;
const MEGA_API_KEY = process.env.MEGA_API_KEY;
const MEGA_URL = 'https://megatec-center.com/api/rest.php';

const getMegaAuthHeader = () => {
    const authString = Buffer.from(`${MEGA_USERNAME}:${MEGA_API_KEY}`).toString('base64');
    return { 'Authorization': `Basic ${authString}` };
};

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
        res.json({ success: false, message: "فشل تحديث قائمة الخدمات" });
    } catch (e) {
        if (cachedServices) return res.json({ success: true, game_list: cachedServices });
        res.status(500).json({ success: false, message: "خطأ اتصال مع سيرفر الشحن" });
    }
});

app.post('/api/mega/recharge', async (req, res) => {
    try {
        const { phone, playerId, serviceId, serviceName, price } = req.body;
        if (!phone || !playerId || !serviceId) {
            return res.status(400).json({ success: false, message: 'جميع الحقول مطلوبة' });
        }

        const itemPrice = price ? Number(price) : 0;
        let user = null;

        if (itemPrice > 0) {
            user = await User.findOneAndUpdate(
                { phone, bal: { $gte: itemPrice } },
                { $inc: { bal: -itemPrice } },
                { new: true }
            );

            if (!user) return res.status(400).json({ success: false, message: 'رصيدك الحالي غير كافٍ' });
        } else {
            user = await User.findOne({ phone });
        }

        const referenceId = "MEGA-" + Date.now() + Math.floor(100 + Math.random() * 900);

        const newTxn = new Transaction({
            userId: user ? user._id : null,
            phone,
            type: 'game',
            targetId: String(playerId),
            serviceId: String(serviceId),
            serviceName: serviceName || 'شحن الألعاب - Mega Center',
            price: itemPrice,
            referenceId
        });
        await newTxn.save();

        const response = await axios.post('https://megacenter.online/api/v1/orders', {
            player_id: playerId,
            service_id: serviceId,
            reference_id: referenceId
        }, {
            headers: { 'Authorization': `Bearer ${MEGA_API_KEY}`, 'Content-Type': 'application/json' },
            timeout: 30000
        });

        if (response.data && response.data.status === 'success') {
            newTxn.megaOrderId = response.data.order_id || null;
            newTxn.status = 'تم التنفيذ بنجاح ✅';
            await newTxn.save();

            return res.json({ success: true, message: 'تم تنفيذ الشحن بنجاح', data: response.data, transaction: newTxn });
        } else {
            if (itemPrice > 0 && user) await User.findByIdAndUpdate(user._id, { $inc: { bal: itemPrice } });
            newTxn.status = 'فشلت العملية ❌';
            newTxn.errorCode = response.data?.message || 'خطأ من المزود';
            await newTxn.save();

            return res.status(400).json({ success: false, message: 'فشلت عملية الشحن وتم إرجاع المبلغ', error: response.data });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'خطأ أثناء الاتصال بسيرفر ميجا سنتر', error: error.message });
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
                newTxn.status = 'تم التنفيذ بنجاح ✅';
                newTxn.megaOrderId = data.orderid;
                await newTxn.save();

                const nTitle = "نجاح الشحن الفوري ⚡";
                const nBody = `تم تنفيذ طلب ${serviceName} للرقم ${user_id} بنجاح.`;
                await new Message({ receiver: phone, title: nTitle, body: nBody }).save();
                sendPushNotification(phone, nTitle, nBody);

                return res.json({ success: true, currentBal: user.bal, orderId: data.orderid });
            } else {
                await User.findByIdAndUpdate(user._id, { $inc: { bal: itemPrice } });
                newTxn.status = 'فشلت العملية ❌';
                newTxn.errorCode = data.code;
                await newTxn.save();
                return res.json({ success: false, message: "فشلت عملية الشحن" });
            }
        } catch (e) {
            newTxn.status = 'معلقة ⚠️';
            newTxn.errorCode = 'TIMEOUT_ERROR';
            await newTxn.save();
            return res.json({ success: false, message: "العملية قيد المعالجة" });
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

        if (String(status) === '1') {
            txn.status = 'تم التنفيذ بنجاح ✅';
            txn.megaOrderId = orderid;
            await txn.save();
        } else if (String(status) === '0') {
            txn.status = 'فشلت العملية ❌';
            txn.megaOrderId = orderid;
            await txn.save();
            if (txn.userId) await User.findByIdAndUpdate(txn.userId, { $inc: { bal: txn.price } });
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// ==========================================
// 🔔 9. مسارات الإشعارات والرسائل
// ==========================================

app.post('/api/notifications/register-token', async (req, res) => {
    try {
        const { phone, token } = req.body;
        if (!phone || !token) return res.status(400).json({ success: false, message: 'بيانات ناقصة' });

        await DeviceToken.findOneAndUpdate({ token }, { phone, token }, { upsert: true, new: true });
        res.json({ success: true, message: 'تم حفظ توكن الجهاز بنجاح' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'خطأ في تسجيل توكن الجهاز' });
    }
});

app.post('/api/register-token', async (req, res) => {
    const { token, user_id } = req.body;
    if (!token || !user_id) return res.status(400).json({ success: false, message: "بيانات ناقصة" });
    try {
        await DeviceToken.findOneAndUpdate({ token }, { phone: user_id, token }, { upsert: true, new: true });
        res.json({ success: true, message: "تم تسجيل جهازك بنجاح" });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.post('/api/notifications/send-user', authenticateAdmin, async (req, res) => {
    try {
        const { phone, title, body } = req.body;
        await sendPushNotification(phone, title, body);
        res.json({ success: true, message: 'تم إرسال الإشعار بنجاح' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'خطأ في إرسال الإشعار', error: error.message });
    }
});

app.post('/api/messages/send', authenticateAdmin, async (req, res) => {
    const { receiver, title, body, imageUrl } = req.body;
    try {
        await new Message({ receiver, title, body, imageUrl: imageUrl || "" }).save();
        if (receiver === 'ALL') {
            const devices = await DeviceToken.find({});
            const tokens = devices.map(d => d.token);
            if (tokens.length > 0 && admin.apps.length > 0) {
                await admin.messaging().sendEachForMulticast({
                    notification: { title, body, ...(imageUrl && { imageUrl }) },
                    tokens
                });
            }
        } else {
            await sendPushNotification(receiver, title, body, imageUrl);
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/messages/:phone', async (req, res) => {
    try {
        const messages = await Message.find({ $or: [{ receiver: req.params.phone }, { receiver: 'ALL' }] }).sort({ _id: -1 });
        res.json(messages);
    } catch (e) { res.status(500).json([]); }
});

// ==========================================
// 🛍️ 10. مسارات الفئات والمنتجات والطلبات
// ==========================================

app.get('/api/categories', async (req, res) => {
    try { res.json(await Category.find({})); } catch (e) { res.status(500).json([]); }
});

app.get('/api/products', async (req, res) => {
    try { res.json(await Product.find({})); } catch (e) { res.status(500).json([]); }
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

// ==========================================
// 👑 11. مسارات الإدارة والتحكم (Admin APIs)
// ==========================================

app.get('/api/admin/stats', authenticateAdmin, async (req, res) => {
    try {
        res.json({
            productsCount: await Product.countDocuments(),
            usersCount: await User.countDocuments(),
            pendingOrders: await Order.countDocuments({ status: 'قيد المراجعة ⏳' }),
            categoriesCount: await Category.countDocuments()
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json({ success: true, count: users.length, users });
    } catch (error) {
        res.status(500).json({ success: false, message: 'خطأ في جلب قائمة المستخدمين' });
    }
});

app.post('/api/admin/update-balance', authenticateAdmin, async (req, res) => {
    try {
        const { phone, amount, action } = req.body;
        if (!phone || amount === undefined || !['add', 'subtract'].includes(action)) {
            return res.status(400).json({ success: false, message: 'بيانات تعديل الرصيد غير صالحة' });
        }

        const adjustAmount = action === 'add' ? Number(amount) : -Number(amount);
        const user = await User.findOneAndUpdate(
            { phone },
            { $inc: { bal: adjustAmount } },
            { new: true }
        ).select('-password');

        if (!user) return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });

        res.json({ success: true, message: 'تم تحديث الرصيد بنجاح', user });
    } catch (error) {
        res.status(500).json({ success: false, message: 'حدث خطأ أثناء تعديل الرصيد' });
    }
});

app.post('/api/admin/user/update-balance', authenticateAdmin, async (req, res) => {
    const { phone, newBalance } = req.body;
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

app.post('/api/admin/update-account-status', authenticateAdmin, async (req, res) => {
    try {
        const { phone, accountStatus } = req.body;
        if (!phone || !['verified', 'unverified'].includes(accountStatus)) {
            return res.status(400).json({ success: false, message: 'حالة الحساب غير صحيحة' });
        }

        const user = await User.findOneAndUpdate({ phone }, { accountStatus }, { new: true }).select('-password');
        if (!user) return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });

        res.json({ success: true, message: 'تم تحديث حالة التوثيق بنجاح', user });
    } catch (error) {
        res.status(500).json({ success: false, message: 'حدث خطأ أثناء تعديل حالة التوثيق' });
    }
});

app.get('/api/admin/transactions', authenticateAdmin, async (req, res) => {
    try {
        const transactions = await Transaction.find().sort({ _id: -1 }).limit(100);
        res.json({ success: true, count: transactions.length, transactions });
    } catch (error) {
        res.status(500).json({ success: false, message: 'خطأ في جلب سجل المعاملات' });
    }
});

app.get('/api/admin/categories', authenticateAdmin, async (req, res) => {
    try { res.json(await Category.find({}).sort({ _id: -1 })); } catch (e) { res.status(500).json([]); }
});

app.post('/api/admin/category/add', authenticateAdmin, async (req, res) => {
    try {
        await new Category({ name: req.body.name, sub: req.body.sub, img: req.body.img }).save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/admin/category/delete', authenticateAdmin, async (req, res) => {
    try {
        await Category.findByIdAndDelete(req.body.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/admin/products', authenticateAdmin, async (req, res) => {
    try { res.json(await Product.find({}).sort({ _id: -1 })); } catch (e) { res.status(500).json([]); }
});

app.post('/api/admin/products/add', authenticateAdmin, async (req, res) => {
    try {
        await new Product({ name: req.body.name, price: Number(req.body.price), img: req.body.image, cat: req.body.cat }).save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/admin/products/delete', authenticateAdmin, async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.body.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/admin/orders', authenticateAdmin, async (req, res) => {
    try { res.json(await Order.find({}).sort({ _id: -1 })); } catch (e) { res.status(500).json([]); }
});

app.post('/api/admin/orders/update-status', authenticateAdmin, async (req, res) => {
    try {
        const order = await Order.findOneAndUpdate({ id: req.body.id }, { status: req.body.status }, { new: true });
        if (order) sendPushNotification(order.phone, "تحديث حالة الطلب 📦", `طلبك رقم ${req.body.id} أصبح: ${req.body.status}`);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/admin/tokens', authenticateAdmin, async (req, res) => {
    try { res.json(await DeviceToken.find({}).sort({ _id: -1 })); } catch (e) { res.status(500).json([]); }
});

app.get('/api/admin/settings', authenticateAdmin, async (req, res) => {
    try {
        let config = await AppSetting.findOne();
        if (!config) { config = new AppSetting(); await config.save(); }
        res.json(config);
    } catch (e) { res.status(500).json({}); }
});

app.post('/api/admin/settings/update', authenticateAdmin, async (req, res) => {
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

app.post('/api/admin/mdarahim/save-packages', authenticateAdmin, async (req, res) => {
    const { packages } = req.body;
    if (!Array.isArray(packages) || packages.length === 0) {
        return res.status(400).json({ success: false, message: "يجب إرسال مصفوفة باقات صحيحة" });
    }

    try {
        await MdarahimPackage.deleteMany({});
        await MdarahimPackage.insertMany(packages);
        return res.json({ success: true, message: `تم حفظ ${packages.length} باقة بنجاح في النظام!` });
    } catch (error) {
        return res.status(500).json({ success: false, message: "حدث خطأ أثناء حفظ الباقات في قاعدة البيانات", error: error.message });
    }
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ==========================================
// 🚀 12. تشغيل السيرفر
// ==========================================
app.listen(PORT, () => {
    console.log(`🚀 السيرفر يعمل بنجاح على المنفذ: http://localhost:${PORT}`);
    fetchMdarahimToken();
});

