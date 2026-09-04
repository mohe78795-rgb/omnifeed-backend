const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PUBLIC_DIR = path.join(__dirname, 'public');
app.use(express.static(PUBLIC_DIR));

// قاعدة بيانات مؤقتة للعملاء
const users = [
  { name: 'عمر', phone: '333333333', pass: 'ه', bal: 0 },
  { name: 'محمد', phone: '735429057', pass: '123', bal: 0 }
];

const jawaliTransactions = [];
const usedTransactions = [];

const REMOTE_ADMIN_URL = "https://0zk30qr9iu.onrender.com/api/admin/user/update-balance";
const SECURE_ADMIN_PASS = process.env.ADMIN_PASS || "SECURE_ADMIN_PASS_123";

// تنظيف الرقم واستخراج آخر 9 أرقام لتفادي أخطاء فتح الخط (+967 أو 0)
function cleanPhoneNumber(phone) {
  if (!phone) return '';
  const digitsOnly = phone.toString().replace(/\D/g, '');
  return digitsOnly.slice(-9);
}

app.get('/', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// 📩 استقبال إشعار جوالي من الأتمتة
app.post('/api/jawali', (req, res) => {
  try {
    let { amount, sender, raw, transid } = req.body;

    // استخراج دقيق وتلقائي من النص الخام لضمان جودة البيانات
    if (raw && typeof raw === 'string') {
      const extractedAmount = raw.match(/مبلغ\s*([0-9,.]+)/i);
      if (extractedAmount) {
        amount = parseFloat(extractedAmount[1].replace(/,/g, ''));
      }

      const extractedSender = raw.match(/من\s*(\d+)/i);
      if (extractedSender) {
        sender = extractedSender[1];
      }
    }

    const cleanSender = cleanPhoneNumber(sender);

    if (!transid) {
      transid = `JW-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }

    const newTx = {
      amount: Number(amount) || 0,
      sender: cleanSender || 'غير معروف',
      rawSender: sender || '',
      transid,
      raw: raw || '',
      createdAt: new Date()
    };

    jawaliTransactions.push(newTx);
    console.log("📩 تم تسجيل الحوالة بنجاح:", newTx);

    return res.status(200).json({ status: 'success', message: 'تم حفظ الحوالة بنجاح', data: newTx });
  } catch (error) {
    console.error("❌ خطأ استقبال الحوالة:", error.message);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

// 💳 مطابقة الحوالة وإضافة الرصيد لحساب العميل
app.post('/api/user/recharge', async (req, res) => {
  try {
    const { amount, sender } = req.body;

    if (!sender || !amount) {
      return res.status(400).json({ success: false, message: 'رقم المرسل والمبلغ مطلوبان' });
    }

    const inputSenderClean = cleanPhoneNumber(sender);
    const inputAmount = Number(amount);

    // البحث عن أحدث حوالة مطابقة للرقم والمبلغ
    const matchedJawaliTx = jawaliTransactions
      .filter(tx => tx.sender === inputSenderClean && Number(tx.amount) === inputAmount)
      .sort((a, b) => b.createdAt - a.createdAt)[0];

    if (!matchedJawaliTx) {
      return res.status(404).json({ 
        success: false, 
        message: 'لم يتم العثور على حوالة بهذه البيانات، يرجى التأكد من وصول الرسالة أو صحة المدخلات.' 
      });
    }

    // منع استخدام الحوالة أكثر من مرة
    const isAlreadyUsed = usedTransactions.some(tx => tx.transid === matchedJawaliTx.transid);
    if (isAlreadyUsed) {
      return res.status(400).json({ success: false, message: 'تم استخدام هذه الحوالة وتأكيدها سابقاً!' });
    }

    let user = users.find(u => cleanPhoneNumber(u.phone) === inputSenderClean);
    if (!user) {
      user = { name: 'عميل جوالي', phone: inputSenderClean, bal: 0 };
      users.push(user);
    }

    const newBalance = user.bal + inputAmount;

    // مراسلة سيرفر الإدارة الخارجي وتحديث الرصيد
    const remoteResponse = await axios.post(REMOTE_ADMIN_URL, {
      adminPass: SECURE_ADMIN_PASS,
      phone: inputSenderClean,
      newBalance: newBalance
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    if (remoteResponse.data && remoteResponse.data.success) {
      user.bal = newBalance;
      usedTransactions.push({
        transid: matchedJawaliTx.transid,
        phone: inputSenderClean,
        amount: inputAmount,
        usedAt: new Date()
      });

      return res.status(200).json({
        success: true,
        message: `تم اعتماد الحوالة وشحن رصيدك بـ ${inputAmount} ريال بنجاح.`,
        newBalance: user.bal
      });
    } else {
      return res.status(400).json({
        success: false,
        message: remoteResponse.data.message || "فشلت عملية تحديث الرصيد"
      });
    }

  } catch (error) {
    console.error('❌ خطأ معالجة الشحن:', error.message);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء معالجة الحوالة',
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 السيرفر يعمل بنجاح على المنفذ: ${PORT}`);
});

