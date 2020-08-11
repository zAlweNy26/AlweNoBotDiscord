const config = require("./../../config.json");
const mine = require('./../../functions.js');
const { Command } = require('discord-akairo');
const Discord = require("discord.js");
const request = require("request");
const _ = require("underscore");

class SRKGame extends Command {
    constructor() {
        super('srkgame', {
           aliases: ['srkgame', 'srkg'],
           ownerOnly: false,
           channelRestriction: 'guild',
           category: 'Misc',
           typing: false,
           userPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
           clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
           args: [{
    				 id: 'game',
             type: 'lowercase',
    				 prompt: {
               start: '***questo comando ha bisogno di un argomento (***\`[gioco]\`***) per funzionare.***',
               retry: '***devi inserire un argomento (***\`[gioco]\`***) valido !***',
               ended: '***tentativi massimi raggiunti per utilizzare questo comando. Comando cancellato.***',
               timeout: '***tempo scaduto per inserire un argomento (***\`[gioco]\`***) valido.***'
    				 }
    			 }],
           description: {
             content: '*Mostra i primi 10 classificati nel gioco* **[gioco]**',
             usage: config.prefix + 'srkgame [gioco|list]',
             examples: [config.prefix + 'srkgame list', config.prefix + 'srkg SF5']
           }
        });
    }

    exec(message, args) {
      let bot = this.client, games = ["SF5", "DBFZ", "T7", "GGXRD", "SKULLGIRL", "IGAU", "MKX",
                                      "KI", "INJUSTICE2", "MVCI", "BBCP", "USF4", "UMVC3"];
      if (args.game === "list" || games.includes(args.game.toUpperCase()) === false) {
        let abbr = "";
        for (let i = 0; i < games.length; i++) {
          if (i === 0) abbr = games[i] + abbr;
          else abbr = games[i] + ", " + abbr;
        }
        let err = bot.util.embed().setColor(0xC80000)
          .setDescription(`***Le abbreviazioni disponibili per i giochi sono :*** \`` + abbr + `\``);
        message.channel.send({embed: err});
      } else {
        request({
          url: "http://rank.shoryuken.com/api/top?game=" + args.game.toLowerCase() + "&format=json",
          method: 'GET'
        }, function (error, response, body) {
          if (response.statusCode === 404 || error || _.isEqual(JSON.parse(body), JSON.parse("{}"))) {
            let err = bot.util.embed().setColor(0xC80000)
              .setDescription(`***Il gioco \`${args.game.toUpperCase()}\` non è presente nel database di shoryuken.com !***`);
            message.channel.send({embed: err});
          } else if (!error && response.statusCode === 200) {
            let srkgame = JSON.parse(body), tensg = "";
            for (let i = 0; i < 10; i++) tensg = tensg + `\`${srkgame[i].rank}\`° : \`${srkgame[i].name}\` (${mine.getCountryName(srkgame[i].country.toUpperCase())})\n`;
            let srkg = bot.util.embed().setColor(`RANDOM`).setTimestamp().setFooter("© StarDust by zAlweNy26#1059")
              .setAuthor(`Primi 10 classificati su ${args.game.toUpperCase()}`, bot.user.avatarURL)
              .addField("Classifica", tensg, true)
            message.channel.send({embed: srkg});
          }
        })
      }
    }
}

module.exports = SRKGame;
