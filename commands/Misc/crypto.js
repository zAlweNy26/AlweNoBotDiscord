const config = require("./../../config.json");
const mine = require('./../../functions.js');
const { Command } = require('discord-akairo');
const Discord = require("discord.js");
const request = require("request");
const _ = require("underscore");

class CryptoMonete extends Command {
    constructor() {
        super('crypto', {
           aliases: ['crypto'],
           ownerOnly: false,
           channelRestriction: 'guild',
           category: 'Misc',
           typing: false,
           userPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
           clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
           args: [{
    				 id: 'currency',
             type: 'lowercase',
    				 prompt: {
               start: '***questo comando ha bisogno di un argomento (***\`[moneta]\`***) per funzionare.***',
               retry: '***devi inserire un argomento (***\`[moneta]\`***) valido !***',
               ended: '***tentativi massimi raggiunti per utilizzare questo comando. Comando cancellato.***',
               timeout: '***tempo scaduto per inserire un argomento (***\`[moneta]\`***) valido.***'
    				 }
    			 }],
           description: {
             content: '*Mostra informazioni sulla cryptomoneta* **[moneta]**',
             usage: config.prefix + 'crypto [moneta]',
             examples: [config.prefix + 'crypto bitcoin', config.prefix + 'crypto ethereum']
           }
        });
    }

    exec(message, args) {
      let bot = this.client;
      request({
        url: "https://api.coingecko.com/api/v3/coins/markets?vs_currency=eur&ids=" + args.currency,
        method: 'GET'
      }, function (error, response, body) {
        if (response.statusCode === 404 || error || _.isEqual(JSON.parse(body), JSON.parse("[]"))) {
          let err = bot.util.embed().setColor(0xC80000)
            .setDescription(`***La cryptomoneta \`${args.currency}\` non esiste, controlla l'ortografia e riprova !***`);
          message.channel.send({embed: err});
        } else if (!error && response.statusCode === 200) {
          let all = JSON.parse(body);
          let crypto = bot.util.embed().setColor(0x00AE86).setTimestamp().setFooter("© AlweNoBot by zAlweNy26#1059")
            .setAuthor(`Dati sulla cryptomoneta ${all[0].name} (${all[0].symbol.toUpperCase()})`, bot.user.avatarURL)
            .setThumbnail(all[0].image)
            .addField("Prezzo", "€ " + parseFloat(all[0].current_price).toFixed(2), true)
            .addField("Prezzo in 24h", parseFloat(all[0].price_change_percentage_24h).toFixed(2) + " %", true)
            .addField("Prezzo più alto in 24h", "€ " + parseFloat(all[0].high_24h).toFixed(2), true)
            .addField("Prezzo più basso in 24h", "€ " + parseFloat(all[0].low_24h).toFixed(2), true)
          message.channel.send({embed: crypto});
        }
      })
    }
}

module.exports = CryptoMonete;
