// One-off script to create the first admin account.
// Usage: node seedAdmin.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  const email = 'admin@gmail.com';
  const existing = await User.findOne({ email });

  if (existing) {
    console.log('Admin already exists:', email);
  } else {
    await User.create({
      name: 'System Admin',
      email,
      password: 'admin123',
      role: 'admin',
    });
    console.log('Admin created — email: admin@gmail.com / password: admin123');
    console.log('Please log in and consider changing this password.');
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
