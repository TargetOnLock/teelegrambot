import { Telegraf } from 'telegraf';

const bot = new Telegraf(process.env.BOT_TOKEN);

// Process updates from Telegram
export default async function handler(req, res) {
    if (req.method === 'POST') {
        try {
            const update = req.body;
            await bot.handleUpdate(update);
            res.status(200).send('OK');
        } catch (error) {
            console.error('Error handling update:', error);
            res.status(500).send('Internal Server Error');
        }
    } else {
        res.status(405).send('Method Not Allowed');
    }
}
