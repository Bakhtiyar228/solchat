import { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient } from 'mongodb';

const url = 'mongodb+srv://Bakhtiyar:1234@cluster0.qkzth0h.mongodb.net';
const dbName = 'users';

const checkGuestWallet = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { walletAddress, roomId } = req.body;

    if (!walletAddress || typeof walletAddress !== 'object' || !roomId || typeof roomId !== 'string') {
        return res.status(400).json({ error: 'Wallet address must be an object and room ID must be a string' });
    }

    let client: MongoClient | null = null;

    try {
        client = new MongoClient(url);
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection('invites');

        const invite = await collection.find({ guest: walletAddress.publicKey, roomId }).toArray();
        if (invite && invite.length > 0) {
            res.status(200).json({ exists: true });
        } else {
            res.status(200).json({ exists: false });
        }
    } catch (error) {
        console.error('Error connecting to MongoDB or querying the database:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        if (client) {
            await client.close();
        }
    }
};

export default checkGuestWallet;
