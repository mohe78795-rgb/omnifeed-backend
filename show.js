const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://mohe78795_db_user:737465252@cluster0.qr9q8iv.mongodb.net/test";
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    console.log("تم الاتصال بنجاح!");

    const db = client.db('test');
    const collection = db.collection('mdarahimpackages');

    // قراءة وطباعة كل البيانات
    const data = await collection.find({}).toArray();
    console.log(JSON.stringify(data, null, 2));

  } catch (err) {
    console.error("خطأ:", err);
  } finally {
    await client.close();
  }
}

run();
