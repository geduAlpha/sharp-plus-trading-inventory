const mongoose = require('mongoose');

// Keep a module-level connection promise so concurrent requests
// during a cold start don't each try to open their own connection.
let connectionPromise = null;
let mongoServer = null;

const connectDB = async () => {
  // Already connected — return immediately
  if (mongoose.connection.readyState === 1) return;

  // Connection in progress — wait for it
  if (connectionPromise) return connectionPromise;

  let uri =
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    process.env.MONGO_URL ||
    process.env.DATABASE_URL;

  const attempt = async () => {
    // If a non-local URI is provided, attempt to connect to it
    if (uri && !uri.includes('127.0.0.1:27017') && !uri.includes('localhost:27017')) {
      try {
        const conn = await mongoose.connect(uri, {
          serverSelectionTimeoutMS: 15000,
          socketTimeoutMS: 60000,
          family: 4,
        });
        console.log(`[DB] MongoDB connected (Remote): ${conn.connection.host}`);
        connectionPromise = null;
        return;
      } catch (error) {
        console.error(`[DB] Remote connection failed: ${error.message}`);
      }
    }

    // If local URI is provided, test if local daemon is running
    if (uri && (uri.includes('127.0.0.1:27017') || uri.includes('localhost:27017'))) {
      try {
        const conn = await mongoose.connect(uri, {
          serverSelectionTimeoutMS: 2000,
          family: 4,
        });
        console.log(`[DB] Local MongoDB connected: ${conn.connection.host}`);
        connectionPromise = null;
        return;
      } catch (error) {
        console.log(`[DB] Local MongoDB daemon on 27017 not detected (${error.message}).`);
      }
    }

    // Fall back to MongoMemoryServer
    try {
      console.log('[DB] Attempting embedded MongoDB instance fallback...');
      let MongoMemoryServer;
      try {
        MongoMemoryServer = require('mongodb-memory-server').MongoMemoryServer;
      } catch (reqErr) {
        console.warn('[DB] mongodb-memory-server is not installed in production:', reqErr.message);
      }
      if (MongoMemoryServer) {
        if (!mongoServer) {
          mongoServer = await MongoMemoryServer.create();
        }
        const memUri = mongoServer.getUri();
        const conn = await mongoose.connect(memUri, { family: 4 });
        console.log(`[DB] Embedded MongoDB connected: ${conn.connection.host}`);
        connectionPromise = null;
        return;
      }
    } catch (memErr) {
      console.error('[DB] Failed to launch embedded MongoDB:', memErr.message);
      connectionPromise = null;
    }
  };

  connectionPromise = attempt();
  return connectionPromise;
};

// Handle unexpected disconnection — log and attempt reconnect
mongoose.connection.on('disconnected', () => {
  console.warn('[DB] MongoDB disconnected. Will reconnect on next request.');
  connectionPromise = null;
});

mongoose.connection.on('error', (err) => {
  console.error('[DB] MongoDB error:', err.message);
  connectionPromise = null;
});

module.exports = connectDB;
