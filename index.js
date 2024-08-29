const { Telegraf } = require('telegraf');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Initialize the bot with your API token
const bot = new Telegraf(process.env.BOT_TOKEN);

// Load or create the user data file
const dataPath = path.join(__dirname, 'data', 'users.json');
let users = {};

if (fs.existsSync(dataPath)) {
    users = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
} else {
    fs.mkdirSync(path.dirname(dataPath), { recursive: true });
    fs.writeFileSync(dataPath, JSON.stringify(users));
}

// Save user data to file
function saveUserData() {
    fs.writeFileSync(dataPath, JSON.stringify(users, null, 2));
}

// Set up webhook URL
const setWebhook = async () => {
    const webhookUrl = `https://${process.env.VERCEL_URL}/api/webhook`;

    try {
        const url = `https://api.telegram.org/bot${process.env.BOT_TOKEN}/setWebhook`;
        const response = await fetch(`${url}?url=${webhookUrl}`);
        const result = await response.json();
        if (result.ok) {
            console.log('Webhook set successfully!');
        } else {
            console.error('Failed to set webhook:', result.description);
        }
    } catch (error) {
        console.error('Error setting webhook:', error);
    }
};

// Set the webhook when the app starts
setWebhook();

// Define your bot commands and handlers here

// Main menu with buttons
const mainMenu = Markup.inlineKeyboard([
    [Markup.button.callback('Join Community', 'join_community')],
    [Markup.button.callback('Referral', 'get_referral')],
    [Markup.button.callback('Leaderboard', 'show_leaderboard')],
    [Markup.button.callback('Register Wallet', 'register_wallet')]
]);

// Welcome message
bot.start((ctx) => {
    const userId = ctx.from.id;
    if (!users[userId]) {
        users[userId] = {
            points: 10, // Start with 10 points
            referrals: 0,
            wallet: null,
            username: ctx.from.username || ctx.from.id.toString(),
            waitingForWallet: false
        };
        saveUserData();
    } else {
        // If user already exists, just update points if they haven't started
        users[userId].points = (users[userId].points || 0) + 10;
        saveUserData();
    }

    ctx.replyWithPhoto(
        { url: 'https://photos.pinksale.finance/file/pinksale-logo-upload/1724943042116-85aa0b58febdd71098f8ace9c9d312d9.png' },
        {
            caption: `Thank you for joining our community! We're excited to have you on board. 🎉\n\nHere’s what you can do:\n\nReferrals: Spread the word and earn rewards for bringing friends into our awesome community!\nLeaderboard: Check out the leaderboard to see where you stand and climb the ranks.\n💎 Important: Don’t forget to register your wallet for airdrops at the time of launch. This way, you’ll be first in line to receive exclusive rewards!\n\nStay frosty, my friends! ❄️`,
            ...mainMenu
        }
    );
});

// Join Community button handler
bot.action('join_community', (ctx) => {
    ctx.answerCbQuery();
    ctx.reply('Join our community here: https://t.me/BaseMomsters');
});

// Generate referral link button handler
bot.action('get_referral', (ctx) => {
    const userId = ctx.from.id;
    const referralLink = `https://t.me/BaseMonsterBot?start=${userId}`;
    ctx.answerCbQuery();
    ctx.reply(`Your referral link: ${referralLink}`);
});

// Show leaderboard button handler
bot.action('show_leaderboard', (ctx) => {
    ctx.answerCbQuery();
    let leaderboard = '🏆 Top 100 Referrers 🏆\n\n';
    const sortedUsers = Object.entries(users)
        .sort(([, a], [, b]) => b.points - a.points)
        .slice(0, 100);

    sortedUsers.forEach(([id, user], index) => {
        leaderboard += `${index + 1}. ${user.username}: ${user.points} points\n`;
    });

    ctx.reply(leaderboard);
});

// Register wallet button handler
bot.action('register_wallet', (ctx) => {
    ctx.answerCbQuery();
    ctx.reply('Please send me your Base wallet address.');
    // Set the user's state to expect a wallet address
    users[ctx.from.id].waitingForWallet = true;
    saveUserData();
});

// Process messages for wallet registration
bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    if (users[userId] && users[userId].waitingForWallet) {
        const wallet = ctx.message.text.trim();
        if (/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
            if (users[userId].wallet) {
                await ctx.reply('You have already registered your wallet.');
            } else {
                users[userId].wallet = wallet;
                users[userId].points = (users[userId].points || 0) + 20; // Add 20 points for registering wallet
                users[userId].waitingForWallet = false; // Reset waiting state
                saveUserData();
                await ctx.reply('Your Base wallet address has been successfully registered and you have been awarded 20 points.');
            }
        } else {
            await ctx.reply('Invalid wallet address. Please make sure it is in the correct format and try again.');
        }
    }
});

// Referral tracking logic
bot.on('text', (ctx) => {
    const message = ctx.message.text;
    const referredBy = message.split(' ')[1];
    if (referredBy && users[referredBy]) {
        users[referredBy].points += 10;
        users[referredBy].referrals += 1;
        saveUserData();
    }
});

// Post leaderboard to chat every 15 minutes
setInterval(() => {
    let leaderboard = '🏆 Top 100 Referrers 🏆\n\n';
    const sortedUsers = Object.entries(users)
        .sort(([, a], [, b]) => b.points - a.points)
        .slice(0, 100);

    sortedUsers.forEach(([id, user], index) => {
        leaderboard += `${index + 1}. ${user.username}: ${user.points} points\n`;
    });

    bot.telegram.sendMessage(process.env.CHAT_ID, leaderboard); // Use your group chat ID
}, 900000); // 15 minutes in milliseconds

// Launch the bot
bot.launch();

