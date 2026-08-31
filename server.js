const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://mohe78795_db_user:737465252@cluster0.qr9q8iv.mongodb.net/test?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// 1. مسار جلب الباقات المفلترة من mdarahimpackages
app.get('/api/packages', async (req, res) => {
  try {
    const { provider, numberType, internetType } = req.query;
    const filter = {};
    
    if (provider) filter.provider = provider;
    if (numberType) filter.numberType = { $in: [numberType, 'الكل'] };
    if (internetType) filter.internetType = { $in: [internetType, 'الكل'] };

    const packages = await mongoose.connection.db.collection('mdarahimpackages').find(filter).toArray();
    
    return res.status(200).json({
      status: true,
      count: packages.length,
      data: packages
    });
  } catch (error) {
    console.error("Error fetching packages:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
});

// المسار الرئيسي للسيرفر
app.get('/', (req, res) => {
  res.send('Omnifeed API Backend is Running');
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
