const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const crypto = require('crypto');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// الإعدادات والبرمجيات الوسيطة (Middlewares)
// ==========================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// 1. الاتصال بقاعدة البيانات وإعدادات المزود
// ==========================================
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://mohe78795_db_user:737465252@cluster0.qr9q8iv.mongodb.net/aptomix_card?retryWrites=true&w=majority";

const PROVIDER_CONFIG = {
  apiUrl: process.env.PROVIDER_API_URL || "https://alhirabi.yemoney.net/api/yr/",
  userId: process.env.PROVIDER_USER_ID || "7367",
  username: process.env.PROVIDER_USERNAME || "735429057",
  password: process.env.PROVIDER_PASSWORD || "moh737465252"
};

// تعريف مخطط وموديل الباقات في MongoDB
const packageSchema = new mongoose.Schema({}, { strict: false, collection: 'packages' });
const Package = mongoose.model('Package', packageSchema);

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ متصل بقاعدة بيانات MongoDB (aptomix_card) بنجاح"))
  .catch(err => console.error("❌ خطأ في الاتصال بقاعدة البيانات:", err));

// دالة توليد التوكن التشفيري التوافقي مع المزود MD5
const generateToken = (transid, mobile) => {
  const hashPassword = crypto.createHash('md5').update(PROVIDER_CONFIG.password).digest('hex');
  const rawString = hashPassword + transid + PROVIDER_CONFIG.username + mobile;
  return crypto.createHash('md5').update(rawString).digest('hex');
};

// تحميل ملف JSON المحلي في حال عدم توفر اتصال بقاعدة البيانات
const packagesPath = path.join(__dirname, 'packages.json');
let localPackages = [];
try {
  if (fs.existsSync(packagesPath)) {
    const rawData = fs.readFileSync(packagesPath, 'utf8');
    localPackages = JSON.parse(rawData);
    console.log('✅ تم تحميل بيانات الباقات الاحتياطية بنجاح.');
  }
} catch (error) {
  console.error('⚠️ خطأ في قراءة ملف JSON المحلي:', error.message);
}

// ==========================================
// 2. مسار جلب الباقات (API Packages)
// ==========================================
app.get('/api/packages', async (req, res) => {
  try {
    let packagesData = await Package.find({});
    if (packagesData.length === 0 && localPackages.length > 0) {
      packagesData = localPackages;
    }
    res.status(200).json({
      success: true,
      count: packagesData.length,
      data: packagesData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "فشل جلب محتوى الباقات",
      error: error.message
    });
  }
});

// ==========================================
// 3. مسار جلب رصيد الوكيل وحالة العمليات (Agent & Status)
// ==========================================

// جلب رصيد حسابك لدى المزود (Agent Balance)
app.get('/api/provider/agent/balance', async (req, res) => {
  try {
    const mobile = req.query.mobile || PROVIDER_CONFIG.username;
    const transid = Date.now().toString();
    const token = generateToken(transid, mobile);

    const requestUrl = `${PROVIDER_CONFIG.apiUrl}info?userid=${PROVIDER_CONFIG.userId}&mobile=${mobile}&transid=${transid}&token=${token}&action=balance`;
    const response = await axios.get(requestUrl);

    res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// الاستعلام عن حالة عملية سابقة (Operation Status)
app.get('/api/provider/operation/status', async (req, res) => {
  try {
    const { transidQuery, mobile } = req.query;
    if (!mobile) return res.status(400).json({ success: false, message: "رقم الهاتف مطلوب" });

    const transid = transidQuery || Date.now().toString();
    const token = generateToken(transid, mobile);

    const requestUrl = `${PROVIDER_CONFIG.apiUrl}info?userid=${PROVIDER_CONFIG.userId}&mobile=${mobile}&transid=${transid}&token=${token}&action=status`;
    const response = await axios.get(requestUrl);

    res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 4. خدمات يمن موبايل (Yemen Mobile)
// ==========================================
app.get('/api/provider/yemen-mobile', async (req, res) => {
  try {
    const { action, mobile, amount, offerid, offerkey, method, solfa } = req.query;
    if (!mobile) return res.status(400).json({ success: false, message: "رقم الهاتف مطلوب" });

    const transid = Date.now().toString();
    const token = generateToken(transid, mobile);
    let requestUrl = "";

    // 1. استعلام الرصيد ونوع الخط
    if (action === "query") {
      requestUrl = `${PROVIDER_CONFIG.apiUrl}yem?action=query&userid=${PROVIDER_CONFIG.userId}&mobile=${mobile}&transid=${transid}&token=${token}`;
    }
    // 2. فحص السلفة للرقم
    else if (action === "solfa") {
      requestUrl = `${PROVIDER_CONFIG.apiUrl}yem?action=solfa&userid=${PROVIDER_CONFIG.userId}&mobile=${mobile}&transid=${transid}&token=${token}`;
    }
    // 3. استعلام العروض والباقات المشترك بها حالياً
    else if (action === "queryoffer") {
      requestUrl = `${PROVIDER_CONFIG.apiUrl}yem?action=queryoffer&userid=${PROVIDER_CONFIG.userId}&mobile=${mobile}&transid=${transid}&token=${token}`;
    }
    // 4. تسديد رصيد عادي
    else if (action === "bill") {
      requestUrl = `${PROVIDER_CONFIG.apiUrl}yem?action=bill&userid=${PROVIDER_CONFIG.userId}&mobile=${mobile}&transid=${transid}&token=${token}&amount=${amount}`;
    }
    // 5. تفعيل باقة من الرصيد مباشرة (method: New, Renew, Remove)
    else if (action === "billoffer_direct") {
      requestUrl = `${PROVIDER_CONFIG.apiUrl}yem?action=billoffer&userid=${PROVIDER_CONFIG.userId}&mobile=${mobile}&transid=${transid}&token=${token}&offerid=${offerid}&method=${method || 'New'}`;
    }
    // 6. تسديد باقة وتفعيلها بعملية واحدة (مع خيار السلفة)
    else if (action === "billoffer" || action === "offeryem") {
      requestUrl = `${PROVIDER_CONFIG.apiUrl}offeryem?action=billoffer&userid=${PROVIDER_CONFIG.userId}&mobile=${mobile}&transid=${transid}&token=${token}&offerkey=${offerkey || offerid}&method=${method || 'New'}&solfa=${solfa || 'N'}`;
    } else {
      return res.status(400).json({ success: false, message: "إجراء غير صالح لشركة يمن موبايل" });
    }

    const response = await axios.get(requestUrl);
    res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// شحن يمن موبايل جملة
app.get('/api/provider/yemen-mobile/gomla', async (req, res) => {
  try {
    const { mobile, amount } = req.query;
    if (!mobile || !amount) return res.status(400).json({ success: false, message: "رقم الهاتف والكمية مطلوبان" });

    const transid = Date.now().toString();
    const token = generateToken(transid, mobile);

    const requestUrl = `${PROVIDER_CONFIG.apiUrl}mobilegomla?userid=${PROVIDER_CONFIG.userId}&mobile=${mobile}&transid=${transid}&token=${token}&num=${amount}`;
    const response = await axios.get(requestUrl);

    res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 5. خدمات شركة يو (YOU / MTN)
// ==========================================

// تسديد رصيد يو (مفتوح / فئات شحن فوري) وتفعيل الباقات
app.get('/api/provider/you/bill', async (req, res) => {
  try {
    const { isOffer, mobile, num, type, israsid } = req.query;
    if (!mobile) return res.status(400).json({ success: false, message: "رقم الهاتف مطلوب" });

    const transid = Date.now().toString();
    const token = generateToken(transid, mobile);
    let requestUrl = "";

    // تفعيل باقة وعرض
    if (isOffer === "true") {
      requestUrl = `${PROVIDER_CONFIG.apiUrl}mtnoffer?userid=${PROVIDER_CONFIG.userId}&mobile=${mobile}&transid=${transid}&token=${token}&num=${num}`;
    }
    // تسديد رصيد مفتوح (israsid=1)
    else if (israsid === "1" || israsid === "true") {
      requestUrl = `${PROVIDER_CONFIG.apiUrl}mtn?action=bill&userid=${PROVIDER_CONFIG.userId}&mobile=${mobile}&transid=${transid}&token=${token}&num=${num}&type=${type || 'prepaid'}&israsid=1`;
    }
    // شحن فئات فوري محددة
    else {
      requestUrl = `${PROVIDER_CONFIG.apiUrl}mtn?action=bill&userid=${PROVIDER_CONFIG.userId}&mobile=${mobile}&transid=${transid}&token=${token}&num=${num}&type=${type || 'prepaid'}`;
    }

    const response = await axios.get(requestUrl);
    res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// شحن يو جملة (MTN GOMLA)
app.get('/api/provider/you/gomla', async (req, res) => {
  try {
    const { mobile, amount } = req.query;
    if (!mobile || !amount) return res.status(400).json({ success: false, message: "رقم الهاتف والكمية مطلوبان" });

    const transid = Date.now().toString();
    const token = generateToken(transid, mobile);

    const requestUrl = `${PROVIDER_CONFIG.apiUrl}mtngomla?userid=${PROVIDER_CONFIG.userId}&mobile=${mobile}&transid=${transid}&token=${token}&num=${amount}`;
    const response = await axios.get(requestUrl);

    res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 6. خدمات شركة سبأفون (Sabafon)
// ==========================================

// شحن فوري وباقات سبأفون (شمال وجنوب)
app.get('/api/provider/sabaphone', async (req, res) => {
  try {
    const { type, region, mobile, num } = req.query;
    if (!mobile) return res.status(400).json({ success: false, message: "رقم الهاتف مطلوب" });

    const transid = Date.now().toString();
    const token = generateToken(transid, mobile);
    let requestUrl = "";

    // باقات سبأفون جنوب
    if (region === "south" && type === "offer") {
      requestUrl = `${PROVIDER_CONFIG.apiUrl}sbayoffer?userid=${PROVIDER_CONFIG.userId}&mobile=${mobile}&transid=${transid}&token=${token}&num=${num}`;
    }
    // شحن فوري سبأفون جنوب (SBAY)
    else if (region === "south") {
      requestUrl = `${PROVIDER_CONFIG.apiUrl}sbay?action=bill&userid=${PROVIDER_CONFIG.userId}&mobile=${mobile}&transid=${transid}&token=${token}&num=${num}`;
    }
    // باقات سبأفون شمال
    else if (type === "offer") {
      requestUrl = `${PROVIDER_CONFIG.apiUrl}sabaoffer?userid=${PROVIDER_CONFIG.userId}&mobile=${mobile}&transid=${transid}&token=${token}&num=${num}`;
    }
    // شحن وحدات سبأفون حسب الطلب
    else if (type === "units") {
      requestUrl = `${PROVIDER_CONFIG.apiUrl}sabaunits?userid=${PROVIDER_CONFIG.userId}&mobile=${mobile}&transid=${transid}&token=${token}&num=${num}`;
    }
    // شحن فوري سبأفون شمال افتراضي
    else {
      requestUrl = `${PROVIDER_CONFIG.apiUrl}sabaphone?action=bill&userid=${PROVIDER_CONFIG.userId}&mobile=${mobile}&transid=${transid}&token=${token}&num=${num}`;
    }

    const response = await axios.get(requestUrl);
    res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// شحن سبأفون جملة (Sabafon Gomla)
app.get('/api/provider/sabaphone/gomla', async (req, res) => {
  try {
    const { mobile, amount } = req.query;
    if (!mobile || !amount) return res.status(400).json({ success: false, message: "رقم الهاتف وكمية الوحدات مطلوبان" });

    const transid = Date.now().toString();
    const token = generateToken(transid, mobile);

    const requestUrl = `${PROVIDER_CONFIG.apiUrl}sabagomla?userid=${PROVIDER_CONFIG.userId}&mobile=${mobile}&transid=${transid}&token=${token}&num=${amount}`;
    const response = await axios.get(requestUrl);

    res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 7. خدمات شركة واي (WHY Telecom)
// ==========================================
app.get('/api/provider/why', async (req, res) => {
  try {
    const { actionType, mobile, num, rasid, packageid } = req.query;
    if (!mobile) return res.status(400).json({ success: false, message: "رقم الهاتف مطلوب" });

    const transid = Date.now().toString();
    const token = generateToken(transid, mobile);
    let requestUrl = "";

    // 1. رصيد واي
    if (actionType === "rasid" || rasid) {
      requestUrl = `${PROVIDER_CONFIG.apiUrl}why?action=bill&userid=${PROVIDER_CONFIG.userId}&mobile=${mobile}&transid=${transid}&token=${token}&num=${num}&rasid=${rasid || num}`;
    }
    // 2. باقات واي
    else if (actionType === "package" || packageid) {
      requestUrl = `${PROVIDER_CONFIG.apiUrl}why?action=bill&userid=${PROVIDER_CONFIG.userId}&mobile=${mobile}&transid=${transid}&token=${token}&num=${num}&packageid=${packageid}`;
    }
    // 3. شحن فئات واي المباشرة
    else {
      requestUrl = `${PROVIDER_CONFIG.apiUrl}why?action=bill&userid=${PROVIDER_CONFIG.userId}&mobile=${mobile}&transid=${transid}&token=${token}&num=${num}`;
    }

    const response = await axios.get(requestUrl);
    res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 8. خدمات يمن فورجي (Yemen 4G)
// ==========================================
app.get('/api/provider/yem4g', async (req, res) => {
  try {
    const { action, mobile, amount, type } = req.query;
    if (!mobile) return res.status(400).json({ success: false, message: "رقم الهاتف مطلوب" });

    const transid = Date.now().toString();
    const token = generateToken(transid, mobile);
    let requestUrl = "";

    // 1. استعلام يمن فورجي
    if (action === "query") {
      requestUrl = `${PROVIDER_CONFIG.apiUrl}yem4g?mobile=${mobile}&transid=${transid}&token=${token}&userid=${PROVIDER_CONFIG.userId}&action=query`;
    }
    // 2. سداد باقة (type=1) أو رصيد (type=2) أو تغيير باقة (type=3)
    else {
      requestUrl = `${PROVIDER_CONFIG.apiUrl}yem4g?mobile=${mobile}&transid=${transid}&token=${token}&userid=${PROVIDER_CONFIG.userId}&action=bill&amount=${amount}&type=${type || 1}`;
    }

    const response = await axios.get(requestUrl);
    res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 9. خدمات الهاتف الثابت والإنترنت المنزلي (ADSL & Landline)
// ==========================================
app.get('/api/provider/post-adsl', async (req, res) => {
  try {
    const { action, mobile, amount, type } = req.query; // type: adsl or line
    if (!mobile) return res.status(400).json({ success: false, message: "رقم الهاتف مطلوب (8 أرقام)" });

    const transid = Date.now().toString();
    const token = generateToken(transid, mobile);
    let requestUrl = "";

    // استعلام الفاتورة والرصيد
    if (action === "query") {
      requestUrl = `${PROVIDER_CONFIG.apiUrl}post?action=query&userid=${PROVIDER_CONFIG.userId}&mobile=${mobile}&transid=${transid}&token=${token}`;
    }
    // تسديد الفاتورة
    else {
      requestUrl = `${PROVIDER_CONFIG.apiUrl}post?action=bill&userid=${PROVIDER_CONFIG.userId}&mobile=${mobile}&transid=${transid}&token=${token}&amount=${amount}&type=${type || 'adsl'}`;
    }

    const response = await axios.get(requestUrl);
    res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 10. خدمات عدن نت (Aden Net)
// ==========================================
app.get('/api/provider/adenet', async (req, res) => {
  try {
    const { action, mobile, num } = req.query;
    if (!mobile) return res.status(400).json({ success: false, message: "رقم الشريحة/الهاتف مطلوب" });

    const transid = Date.now().toString();
    const token = generateToken(transid, mobile);
    let requestUrl = "";

    // استعلام عدن نت
    if (action === "query") {
      requestUrl = `${PROVIDER_CONFIG.apiUrl}adenet?action=query&userid=${PROVIDER_CONFIG.userId}&mobile=${mobile}&transid=${transid}&token=${token}&num=${num || ''}`;
    }
    // تسديد وباقات عدن نت
    else {
      requestUrl = `${PROVIDER_CONFIG.apiUrl}adenet?action=bill&userid=${PROVIDER_CONFIG.userId}&mobile=${mobile}&transid=${transid}&token=${token}&num=${num}`;
    }

    const response = await axios.get(requestUrl);
    res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 11. مسار الـ Webhook لتلقي تحديثات العمليات تلقائياً
// ==========================================
app.get('/api/webhook/callback', (req, res) => {
  const { action, backpass, transid, message } = req.query;
  console.log(`📩 استلام تحديث Webhook للعملية [${transid}]: الحالة = ${action} | الرسالة = ${message}`);
  // يمكنك هنا تحديث حالة المعاملة في قاعدة البيانات الخاصة بك
  res.status(200).send("OK");
});

// ==========================================
// 12. تشغيل السيرفر
// ==========================================
app.listen(PORT, () => {
  console.log(`🚀 الخادم يعمل بنجاح على المنفذ: http://localhost:${PORT}`);
});

