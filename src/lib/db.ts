import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

/**
 * Ligação ao MongoDB Atlas com cache global, para não criar uma nova
 * ligação a cada hot-reload em desenvolvimento (padrão recomendado no Next.js).
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var _mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = global._mongoose ?? { conn: null, promise: null };
global._mongoose = cached;

export async function connectToDatabase() {
  if (!MONGODB_URI) {
    throw new Error("Falta a variável de ambiente MONGODB_URI (ver .env.example).");
  }

  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    // Sem isto, uma falha de ligação (ex: IP ainda não estava na whitelist)
    // fica "presa" para sempre nesta instância do servidor — todos os pedidos
    // seguintes repetem o mesmo erro antigo em vez de tentar ligar de novo.
    cached.promise = null;
    throw err;
  }
  return cached.conn;
}
