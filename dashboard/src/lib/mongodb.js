import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/overlay_db';
const dbName = process.env.MONGODB_DB || 'overlay_db';

const options = {
  connectTimeoutMS: 5000,
  serverSelectionTimeoutMS: 5000,
};

let client;
let clientPromise;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable to preserve connection across HMR
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect().catch((err) => {
      console.warn('[MongoDB] Initial connection error:', err.message);
      global._mongoClientPromise = null;
      throw err;
    });
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, avoid global variable
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export async function getMongoClient() {
  if (!clientPromise) {
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
  }
  return clientPromise;
}

export async function getDatabase() {
  try {
    const connectedClient = await getMongoClient();
    return {
      db: connectedClient.db(dbName),
      client: connectedClient,
      isLive: true,
      dbName,
    };
  } catch (error) {
    return {
      db: null,
      client: null,
      isLive: false,
      error: error.message,
      dbName,
    };
  }
}

export async function checkMongoConnection() {
  try {
    const { isLive, error } = await getDatabase();
    if (!isLive) {
      return {
        connected: false,
        error: error || 'Unable to connect to MongoDB server',
        dbName,
        uri: sanitizeUri(uri),
      };
    }
    return {
      connected: true,
      dbName,
      uri: sanitizeUri(uri),
    };
  } catch (err) {
    return {
      connected: false,
      error: err.message,
      dbName,
      uri: sanitizeUri(uri),
    };
  }
}

function sanitizeUri(rawUri) {
  if (!rawUri) return '';
  return rawUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
}

export default clientPromise;
