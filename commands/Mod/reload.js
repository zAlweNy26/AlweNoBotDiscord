const config = require("./../../config.json");
const mine = require('./../../functions.js');
const { Command } = require('discord-akairo');
const Discord = require("discord.js");

class Reload extends Command {
    constructor() {
        super('reload', {
           aliases: ['reload', 'rl'],
           ownerOnly: true,
           channelRestriction: 'dm',
           category: 'Mod',
           typing: false,
           userPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
           clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
           description: {
             content: '*Riavvia AlweNoBot* ***[SOLO PER IL PROPRIETARIO]***',
             usage: config.prefix + 'reload',
             examples: [config.prefix + 'reload', config.prefix + 'rl']
           }
        });
    }

    async exec(message) {
      let rel = this.client.util.embed().setColor(0xFFDC00)
        .setDescription("💤 ***AlweNoBot sta venendo riavviato...*** 💤")
      message.channel.send({embed: rel}).then(message => {
        this.handler.reloadAll();
        //this.client.destroy();
        delete require.cache[require.resolve(`./../../bot.js`)];
        let done = this.client.util.embed().setColor(0x00DC00)
          .setDescription("✅ ***AlweNoBot è stato riavviato con successo !*** ✅\n\n**Aspetta 2-3 secondi prima di utilizzare un comando !**")
        message.edit({embed: done});
      });//.then(() => this.client.login(process.env.token));
    }
}

module.exports = Reload;
