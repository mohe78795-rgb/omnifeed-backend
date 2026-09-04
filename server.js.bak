const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// تقديم الملفات الثابتة من مجلد public
// ==========================================
app.use(express.static(path.join(__dirname, 'public')));

// قواعد البيانات المؤقتة في الذاكرة
const users = [
  { name: 'عمر', phone: '333333333', pass: 'ه', bal: 0, joinDate: '٣١/٨/٢٠٢٦، ٤:٥٥:٥٨ م' },
  { name: 'محمد', phone: '735429057', pass: '123', bal: 0, joinDate: '٣١/٨/٢٠٢٦، ٥:٠٠:٠٠ م' }
];

const jawaliTransactions = [];
const usedTransactions = [];

const REMOTE_ADMIN_URL = "https://0zk30qr9iu.onrender.com/api/admin/user/update-balance";
const ADMIN_PASS = process.env.ADMIN_PASS || "SECURE_ADMIN_PASS_123";

// مسار الصفحة الرئيسية للواجهة
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// مسار استقبال إشعارات جوالي
app.post('/api/jawali', (req, res) => {
  try {
    let { amount, sender, raw, transid } = req.body;

    if (raw && typeof raw === 'string') {
      if (!amount) {
        const amountMatch = raw.match(/(?:YER|ريال)\s*([0-9,.]+)/i);
        if (amountMatch) amount = parseFloat(amountMatch[1].replace(/,/g, ''));
      }
      if (!sender || sender === 'null' || sender === 'undefined') {
        const senderMatch = raw.match(/(?:من|المرسل)\D*([7][0,1,3,7,8][0-9]{7})/);
        if (senderMatch) {
          sender = senderMatch[1];
        } else {
          const phoneMatch = raw.match(/\b7[01378][0-9]{7}\b/);
          if (phoneMatch) sender = phoneMatch[0];
        }
      }
    }

    if (!transid || transid === 'undefined') {
      transid = `JW-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }

    const newTx = {
      amount: Number(amount) || 0,
      sender: sender ? sender.toString().trim() : 'غير معروف',
      transid,
      raw: raw || '',
      createdAt: new Date()
    };

    jawaliTransactions.push(newTx);
    console.log("📩 تم تسجيل حوالة جوالي جديدة:", newTx);

    return res.status(200).json({ status: 'success', message: 'تم حفظ الحوالة بنجاح' });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

// مسار مطابقة الحوالة والشحن
app.post('/api/user/recharge', async (req, res) => {
  try {
    const { userPhone, amount, sender } = req.body;

    if (!userPhone || !sender) {
      return res.status(400).json({ success: false, message: 'رقم العميل ورقم المرسل مطلوبان' });
    }

    const cleanSender = sender.toString().trim();
    const user = users.find(u => u.phone === userPhone.toString().trim());
    if (!user) {
      return res.status(404).json({ success: false, message: 'حساب العميل غير موجود!' });
    }

    const matchedJawaliTx = jawaliTransactions
      .filter(tx => tx.sender.includes(cleanSender))
      .sort((a, b) => b.createdAt - a.createdAt)[0];

    if (!matchedJawaliTx) {
      return res.status(404).json({ success: false, message: 'لم يتم العثور على حوالة مسجلة بهذا الرقم.' });
    }

    const isAlreadyUsed = usedTransactions.some(tx => tx.transid === matchedJawaliTx.transid);
    if (isAlreadyUsed) {
      return res.status(400).json({ success: false, message: 'هذه الحوالة تم استخدامها مسبقاً!' });
    }

    const finalAmount = matchedJawaliTx.amount || Number(amount);
    const calculatedNewBalance = user.bal + finalAmount;

    // إرسال التحديث إلى الخادم الخارجي
    const remoteResponse = await axios.post(REMOTE_ADMIN_URL, {
      adminPass: ADMIN_PASS,
      phone: userPhone,
      newBalance: calculatedNewBalance
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    if (remoteResponse.data && remoteResponse.data.success) {
      user.bal = calculatedNewBalance;
      usedTransactions.push({
        transid: matchedJawaliTx.transid,
        phone: userPhone,
        amount: finalAmount,
        usedAt: new Date()
      });

      return res.status(200).json({
        success: true,
        message: `تم شحن حسابك بنجاح وإضافة ${finalAmount} ريال إلى رصيدك.`,
        newBalance: user.bal
      });
    } else {
      return res.status(400).json({
        success: false,
        message: remoteResponse.data.message || "فشلت عملية التحديث في السيرفر الخارجي"
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'تعذر الاتصال بسيرفر تحديث الرصيد الخارجي',
      error: error.message
    });
  }
});

app.listen(PORT, () => console.log(`🚀 السيرفر يعمل على: http://localhost:${PORT}`));

