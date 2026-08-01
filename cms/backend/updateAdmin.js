// One-off script to change the admin account's email and/or password.
// Edit CURRENT_EMAIL, NEW_EMAIL, and NEW_PASSWORD below, then run:
//   node updateAdmin.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const CURRENT_EMAIL = 'admin@example.com'; // the admin account to update
const NEW_EMAIL = 'admin@example.com';      // change this if you want a new email
const NEW_PASSWORD = 'admin123';            // change this to your new password

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  const admin = await User.findOne({ email: CURRENT_EMAIL, role: 'admin' });

  if (!admin) {
    console.log(`No admin found with email: ${CURRENT_EMAIL}`);
  } else {
    admin.email = NEW_EMAIL;
    admin.password = NEW_PASSWORD; // triggers the pre-save hook, which hashes it
    await admin.save();
    console.log(`Admin updated — new email: ${NEW_EMAIL} / new password: ${NEW_PASSWORD}`);
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
