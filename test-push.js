const admin = require('firebase-admin');
const serviceAccount = require('./firebase-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const registrationToken = 'cC8uLSfRSf-8s1vyiXI8H3:APA91bEFCsQCZXfYjGRpyW3sbzzo0qKvsqv15TLe7WuYFOXnfTeV_SUp4dokk4bcA8PloXPusE4wxrSv6IWpzRov9mLYUbTuei1Z8Q2K5bYQt0XDbjULX_Y';

const message = {
  notification: {
    title: 'تجربة الإشعارات من ترامكس! 🚀',
    body: 'يا محمد، الإشعارات والـ GPS والواتساب تعمل بأمان وبنجاح عبر المفتاح الجديد!'
  },
  android: {
    notification: {
      channelId: 'messages_channel',
      sound: 'default'
    }
  },
  token: registrationToken
};

admin.messaging().send(message)
  .then((response) => {
    console.log('✅ تم إرسال الإشعار بنجاح! كود الرسالة:', response);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ حدث خطأ أثناء الإرسال:', error);
    process.exit(1);
  });
