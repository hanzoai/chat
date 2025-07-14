#!/bin/bash
# Hanzo Chat entrypoint with demo user initialization

echo "🚀 Starting Hanzo Chat with demo user initialization..."

# Function to wait for MongoDB
wait_for_mongodb() {
  echo "⏳ Waiting for MongoDB to be ready..."
  until mongosh "$MONGO_URI" --eval "db.adminCommand('ping')" > /dev/null 2>&1; do
    sleep 2
  done
  echo "✅ MongoDB is ready"
}

# Function to create demo user
create_demo_user() {
  echo "👤 Creating demo user..."
  
  # Create a temporary Node.js script to add the user
  cat > /tmp/create_demo_user.js << 'EOF'
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Define User schema
    const userSchema = new mongoose.Schema({
      name: String,
      username: { type: String, lowercase: true, required: true },
      email: { type: String, lowercase: true, unique: true, required: true },
      emailVerified: { type: Boolean, default: false },
      password: String,
      role: { type: String, default: 'USER', enum: ['USER', 'ADMIN'] },
      providers: Array,
      avatar: String,
      created: { type: Date, default: Date.now },
      lastLogin: { type: Date, default: Date.now }
    }, { timestamps: true });
    
    const User = mongoose.models.User || mongoose.model('User', userSchema);
    
    // Check if demo user exists
    const existingUser = await User.findOne({ email: 'hattori@hanzo.ai' });
    
    if (!existingUser) {
      const hashedPassword = await bcrypt.hash('demo1234', 10);
      
      const demoUser = new User({
        name: 'Hattori Hanzo',
        username: 'hattori',
        email: 'hattori@hanzo.ai',
        emailVerified: true,
        password: hashedPassword,
        role: 'ADMIN',
        providers: ['local'],
        avatar: 'https://hanzo.ai/avatar/hattori.png'
      });
      
      await demoUser.save();
      console.log('✅ Demo user created: hattori@hanzo.ai / demo1234');
    } else {
      console.log('ℹ️  Demo user already exists');
    }
    
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
EOF

  # Run the script
  node /tmp/create_demo_user.js || true
  rm -f /tmp/create_demo_user.js
}

# Start the initialization in background
(
  wait_for_mongodb
  create_demo_user
) &

# Start the main application
echo "🚀 Starting Hanzo Chat application..."
exec npm run backend