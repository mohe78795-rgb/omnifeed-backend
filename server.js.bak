const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// قاعدة بيانات مؤقتة للعملاء
const users = [
  { name: 'عمر', phone: '333333333', pass: 'ه', bal: 0 },
  { name: 'محمد', phone: '735429057', pass: '123', bal: 0 }
];

const jawaliTransactions = [];
const usedTransactions = [];

// 🔒 بيانات المسؤول محمية داخل السيرفر فقط ومخفية عن العميل
const REMOTE_ADMIN_URL = "https://0zk30qr9iu.onrender.com/api/admin/user/update-balance";
const SECURE_ADMIN_PASS = process.env.ADMIN_PASS || "SECURE_ADMIN_PASS_123";

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// مسار استقبال إشعارات جوالي (Webhook)
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

// مسار مطابقة الحوالة والشحن المباشر
app.post('/api/user/recharge', async (req, res) => {
  try {
    // يستقبل السيرفر فقط رقم المرسل والمبلغ من العميل
    const { amount, sender } = req.body;

    if (!sender || !amount) {
      return res.status(400).json({ success: false, message: 'رقم المرسل والمبلغ مطلوبان' });
    }

    const cleanSender = sender.toString().trim();

    // 1. المطابقة البحثية عن أحدث حوالة قادمة بهذا الرقم
    const matchedJawaliTx = jawaliTransactions
      .filter(tx => tx.sender.includes(cleanSender))
      .sort((a, b) => b.createdAt - a.createdAt)[0];

    if (!matchedJawaliTx) {
      return res.status(404).json({ success: false, message: 'لم يتم العثور على حوالة بهذه البيانات' });
    }

    // 2. التحقق من منع التكرار
    const isAlreadyUsed = usedTransactions.some(tx => tx.transid === matchedJawaliTx.transid);
    if (isAlreadyUsed) {
      return res.status(400).json({ success: false, message: 'تم استخدام هذه الحوالة من قبل!' });
    }

    const finalAmount = matchedJawaliTx.amount || Number(amount);

    // البحث عن الحساب المرتبط برقم المرسل
    let user = users.find(u => u.phone === cleanSender);
    if (!user) {
      user = { name: 'عميل جوالي', phone: cleanSender, bal: 0 };
      users.push(user);
    }

    const newBalance = user.bal + finalAmount;

    // 3. السيرفر يقوم بحقن كلمة مرور الأدمن الآمنة ومخفية عن العميل
    const remoteResponse = await axios.post(REMOTE_ADMIN_URL, {
      adminPass: SECURE_ADMIN_PASS, // محقونة سيرفر لسيرفر
      phone: cleanSender,
      newBalance: newBalance
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    if (remoteResponse.data && remoteResponse.data.success) {
      user.bal = newBalance;
      usedTransactions.push({
        transid: matchedJawaliTx.transid,
        phone: cleanSender,
        amount: finalAmount,
        usedAt: new Date()
      });

      return res.status(200).json({
        success: true,
        message: `تم اعتماد الحوالة وشحن رصيدك بـ ${finalAmount} ريال بنجاح.`,
        newBalance: user.bal
      });
    } else {
      return res.status(400).json({
        success: false,
        message: remoteResponse.data.message || "فشلت عملية تحديث الرصيد"
      });
    }

  } catch (error) {
    console.error('❌ خطأ الشحن:', error.message);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء معالجة الحوالة',
      error: error.message
    });
  }
});

app.listen(PORT, () => console.log(`🚀 السيرفر تعمل بأمان على المنفذ: ${PORT}`));

