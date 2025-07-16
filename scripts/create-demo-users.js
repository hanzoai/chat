const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

async function createDemoUsers() {
  const uri = 'mongodb://hanzo:hanzo123@localhost:27017/HanzoChat?authSource=admin';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('HanzoChat');
    const usersCollection = db.collection('users');

    // Demo users
    const demoUsers = [
      {
        email: 'admin@hanzo.ai',
        username: 'admin',
        name: 'Hanzo Admin',
        password: 'demo1234',
        role: 'ADMIN',
      },
      {
        email: 'hattori@hanzo.ai',
        username: 'hattori',
        name: 'Hattori Hanzo',
        password: 'demo1234',
        role: 'USER',
      },
      {
        email: 'demo@hanzo.ai',
        username: 'demo',
        name: 'Demo User',
        password: 'demo1234',
        role: 'USER',
      }
    ];

    for (const user of demoUsers) {
      // Check if user already exists
      const existingUser = await usersCollection.findOne({ email: user.email });
      
      if (existingUser) {
        console.log(`User ${user.email} already exists, skipping...`);
        continue;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(user.password, 10);

      // Create user document
      const userDoc = {
        email: user.email,
        username: user.username,
        name: user.name,
        password: hashedPassword,
        role: user.role,
        isVerified: true,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        refreshToken: [],
        plugins: [],
        avatar: null,
      };

      const result = await usersCollection.insertOne(userDoc);
      console.log(`Created user: ${user.email} with ID: ${result.insertedId}`);
    }

    console.log('Demo users created successfully!');
  } catch (error) {
    console.error('Error creating demo users:', error);
  } finally {
    await client.close();
  }
}

createDemoUsers();