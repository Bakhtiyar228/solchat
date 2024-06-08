import { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient } from 'mongodb';

const url = 'mongodb+srv://Bakhtiyar:1234@cluster0.qkzth0h.mongodb.net';
const dbName = 'users';

const inviteGuest = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { guest, roomId } = req.body;

  if (!guest || typeof guest !== 'string' || !roomId || typeof roomId !== 'string') {
    return res.status(400).json({ error: 'Guest address and room ID must be strings' });
  }

  let client: MongoClient | null = null;

  try {
    client = new MongoClient(url);
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('invites');
    
    const result = await collection.insertOne({ guest, roomId });
    res.status(200).json({ success: true, result });

  } catch (error) {
    console.error('Internal server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (client) {
      await client.close();
    }
  }
};

export default inviteGuest;
