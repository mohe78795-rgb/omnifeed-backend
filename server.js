const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PUBLIC_DIR = path.join(__dirname, 'public');
app.use(express.static(PUBLIC_DIR));

// الحساب الوحيد الثابت والمستهدف لإضافة الأرصدة
const TARGET_ACCOUNT_PHONE = '735429057';
const users = [
  { name: 'محمد', phone: TARGET_ACCOUNT_PHONE, pass: '123', bal: 0 }
];

const jawaliTransactions = [];
const usedTransactions = [];

// دالة لتنظيف واستخراج آخر 9 أرقام لتفادي أخطاء فتح الخط (+967 أو 0)
function cleanPhoneNumber(phone) {
  if (!phone) return '';
  const digitsOnly = phone.toString().replace(/\D/g, '');
  return digitsOnly.slice(-9);
}

app.get('/', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// 📩 استقبال إشعار جوالي من الأتمتة (Webhook)
app.post('/api/jawali', (req, res) => {
  try {
    let { amount, sender, raw, transid } = req.body;

    // استخراج بيانات الحوالة بدقة من النص الخام عند الحاجة
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
    console.log("📩 تم تسجيل الحوالة بنجاح في السيرفر:", newTx);

    return res.status(200).json({ status: 'success', message: 'تم حفظ الحوالة بنجاح', data: newTx });
  } catch (error) {
    console.error("❌ خطأ استقبال الحوالة:", error.message);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

// 💳 المطابقة وإضافة الرصيد تلقائياً لحساب 735429057
app.post('/api/user/recharge', async (req, res) => {
  try {
    const { amount, sender } = req.body;

    if (!sender || !amount) {
      return res.status(400).json({ success: false, message: 'رقم مرسل الحوالة والمبلغ مطلوبان' });
    }

    const inputSenderClean = cleanPhoneNumber(sender);
    const inputAmount = Number(amount);

    console.log(`🔍 طلب مطابقة حوالة من المُرسِل: ${inputSenderClean} بمبلغ: ${inputAmount}`);

    // 1. المطابقة الصارمة بين البيانات المدخلة في الواجهة والحوالات القادمة من الأتمتة
    const matchedJawaliTx = jawaliTransactions
      .filter(tx => tx.sender === inputSenderClean && Number(tx.amount) === inputAmount)
      .sort((a, b) => b.createdAt - a.createdAt)[0];

    if (!matchedJawaliTx) {
      return res.status(404).json({ 
        success: false, 
        message: 'لم يتم العثور على حوالة بهذه البيانات، يرجى التأكد من رقم المُرسِل والمبلغ الصحيح.' 
      });
    }

    // 2. منع تكرار الشحن لنفس الحوالة
    const isAlreadyUsed = usedTransactions.some(tx => tx.transid === matchedJawaliTx.transid);
    if (isAlreadyUsed) {
      return res.status(400).json({ success: false, message: 'تم استخدام هذه الحوالة واعتمادها سابقاً!' });
    }

    // 3. العثور على الحساب الثابت المستهدف للإيداع
    const targetUser = users.find(u => cleanPhoneNumber(u.phone) === TARGET_ACCOUNT_PHONE);
    if (!targetUser) {
      return res.status(500).json({ success: false, message: 'الحساب الرئيسي غير معرف في السيرفر' });
    }

    // 4. إضافة المبلغ مباشرة لحساب 735429057
    targetUser.bal += inputAmount;

    // تعليم الحوالة كمستخدمة
    usedTransactions.push({
      transid: matchedJawaliTx.transid,
      sender: inputSenderClean,
      amount: inputAmount,
      usedAt: new Date()
    });

    console.log(`✅ تم اعتماد الحوالة القادمة من ${inputSenderClean} وإضافة ${inputAmount} ريال لحساب ${targetUser.phone}. الرصيد الجديد: ${targetUser.bal}`);

    return res.status(200).json({
      success: true,
      message: `تمت المطابقة بنجاح! تم إضافة ${inputAmount} ريال إلى حسابك (${targetUser.phone}).`,
      newBalance: targetUser.bal
    });

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

