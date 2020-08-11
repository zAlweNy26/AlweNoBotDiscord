const config = require("./config.json");
const { AkairoClient } = require('discord-akairo');

const bot = new AkairoClient({
    ownerID: config.ownerID,
    prefix: config.prefix,
    allowMention: false,
    handleEdits: true,
    commandUtil: true,
    automateCategories: true,
    commandUtilLifetime: 86400000,
    defaultCooldown: 2,
    commandDirectory: './commands/',
    //inhibitorDirectory: './inhibitors/',
    //listenerDirectory: './listeners/'
}, {
    disableEveryone: true
});

bot.login(process.env.token).then(() => {
  console.log(`Bot connesso !\nCon ${bot.users.size - 1} utenti, in ${bot.guilds.size} server !`);
  bot.user.setPresence({ game: { name: config.prefix + 'help | v' + config.version, type: 'PLAYING' }, status: 'online' })
  .catch(console.error);
});

bot.on("disconnected", () => console.log("\nBot disconnesso !"))
  .on('reconnect', () => console.log('\nIl bot sta provando a riconnettersi...'))
  .on('error', err => console.log(err))
  .on('warn', info => console.log(info));
