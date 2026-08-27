// One-off script to create the first operator account.
// Usage: node seedAdmin.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  const email = 'admin@example.com';
  const existing = await User.findOne({ email });

  if (existing) {
    console.log('Operator account already exists:', email);
  } else {
    await User.create({
      name: 'Pipeline Operator',
      email,
      password: 'admin123',
    });
    console.log('Operator account created — email: admin@example.com / password: admin123');
    console.log('Please log in and consider changing this password.');
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
