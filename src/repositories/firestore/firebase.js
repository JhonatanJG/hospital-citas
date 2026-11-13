const admin = require('firebase-admin');
const { FIREBASE_SERVICE_ACCOUNT } = require('../../config/env');

let db;

function getDb() {
  if (!db) {
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(FIREBASE_SERVICE_ACCOUNT) });
    }
    db = admin.firestore();
  }
  return db;
}

module.exports = { getDb };
