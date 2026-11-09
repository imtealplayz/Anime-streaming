import "server-only";
import { Db, MongoClient } from "mongodb";

declare global {
  // Reuse the same connection pool across warm serverless invocations.
  // eslint-disable-next-line no-var
  var __animetealMongoPromise: Promise<MongoClient> | undefined;
  // eslint-disable-next-line no-var
  var __animetealIndexesPromise: Promise<void> | undefined;
}

function getMongoPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not configured for AnimeTeal.");
  }

  if (!globalThis.__animetealMongoPromise) {
    globalThis.__animetealMongoPromise = new MongoClient(uri, {
      maxPoolSize: 10,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      appName: "AnimeTeal",
    }).connect();
  }

  return globalThis.__animetealMongoPromise;
}

export async function getAnimeTealDb(): Promise<Db> {
  const client = await getMongoPromise();
  const db = client.db(process.env.MONGODB_DATABASE || "animeteal");

  if (!globalThis.__animetealIndexesPromise) {
    globalThis.__animetealIndexesPromise = (async () => {
      await Promise.all([
        db.collection("users").createIndex({ discordId: 1 }, { unique: true }),
        db.collection("sessions").createIndex({ tokenHash: 1 }, { unique: true }),
        db.collection("sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
        db.collection("oauth_states").createIndex({ stateHash: 1 }, { unique: true }),
        db.collection("oauth_states").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
        db.collection("auth_tickets").createIndex({ ticketHash: 1 }, { unique: true }),
        db.collection("auth_tickets").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
        db.collection("comments").createIndex({ animeId: 1, createdAt: -1 }),
        db.collection("comments").createIndex({ userDiscordId: 1, createdAt: -1 }),
      ]);
    })();
  }

  await globalThis.__animetealIndexesPromise;
  return db;
}
