#!/usr/bin/env node
/**
 * Seed script to create demo user for Hanzo Chat
 * Email: hattori@hanzo.ai
 * Password: demo1234
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDB connection URL from environment or default
const MONGO_URI = process.env.MONGO_URI || 'mongodb://hanzo:hanzo123@localhost:27017/HanzoChat?authSource=admin';

// User schema (matching LibreChat's schema)
const userSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  username: {
    type: String,
    lowercase: true,
    required: [true, "can't be blank"],
    match: [/^[a-zA-Z0-9_]+$/, 'is invalid'],
    index: true,
  },
  email: {
    type: String,
    lowercase: true,
    unique: true,
    required: [true, "can't be blank"],
    match: [/\S+@\S+\.\S+/, 'is invalid'],
    index: true,
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  password: {
    type: String,
    trim: true,
    minlength: 8,
    maxlength: 128,
  },
  avatar: {
    type: String,
    required: false,
  },
  role: {
    type: String,
    default: 'USER',
    enum: ['USER', 'ADMIN'],
  },
  provider: {
    type: String,
    required: false,
  },
  providers: {
    type: Array,
    required: false,
  },
  refreshToken: {
    type: [String],
    default: [],
  },
  created: {
    type: Date,
    default: Date.now,
  },
  lastLogin: {
    type: Date,
    default: Date.now,
  },
  plugins: {
    type: Array,
    default: [],
  },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function seedDemoUser() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Check if demo user already exists
    const existingUser = await User.findOne({ email: 'hattori@hanzo.ai' });
    
    if (existingUser) {
      console.log('⚠️  Demo user already exists');
      return;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash('demo1234', 10);

    // Create demo user
    const demoUser = new User({
      name: 'Hattori Hanzo',
      username: 'hattori',
      email: 'hattori@hanzo.ai',
      emailVerified: true,
      password: hashedPassword,
      role: 'ADMIN', // First user gets admin role
      avatar: 'https://hanzo.ai/avatar/hattori.png',
      providers: ['local'],
    });

    await demoUser.save();
    console.log('✅ Demo user created successfully!');
    console.log('📧 Email: hattori@hanzo.ai');
    console.log('🔑 Password: demo1234');
    console.log('👤 Role: ADMIN');

  } catch (error) {
    console.error('❌ Error seeding demo user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the seed function
seedDemoUser();