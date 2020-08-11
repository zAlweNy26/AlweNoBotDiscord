const config = require("./../../config.json");
const mine = require('./../../functions.js');
const { Command } = require('discord-akairo');
const Discord = require("discord.js");
const request = require("request");

class Distance extends Command {
  constructor() {
    super('distance', {
      aliases: ['distance', 'dt'],
      ownerOnly: false,
      channelRestriction: 'guild',
      category: 'Info',
      typing: false,
      userPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
      clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
      args: [
        {
          id: 'locda',
          type: 'lowercase',
          prompt: {
            start: '***questo comando ha bisogno di un argomento (***\`[località]\`***) per funzionare.***',
            retry: '***devi inserire un argomento (***\`[località]\`***) valido !***',
            ended: '***tentativi massimi raggiunti per utilizzare questo comando. Comando cancellato.***',
            timeout: '***tempo scaduto per inserire un argomento (***\`[località]\`***) valido.***'
          }
        },
        {
          id: 'loca',
          type: 'lowercase',
          prompt: {
            start: '***questo comando ha bisogno di un argomento (***\`[località]\`***) per funzionare.***',
            retry: '***devi inserire un argomento (***\`[località]\`***) valido !***',
            ended: '***tentativi massimi raggiunti per utilizzare questo comando. Comando cancellato.***',
            timeout: '***tempo scaduto per inserire un argomento (***\`[località]\`***) valido.***'
          }
        }
      ],
      description: {
        content: '*Mostra la distanza (in km) tra le due località*',
        usage: config.prefix + 'distance [località] [località]',
        examples: [config.prefix + 'distance Milano Torino', config.prefix + 'dt Parigi Berlino']
      }
    });
  }

  exec(message, args) {
    let bot = this.client;
    request({
      url: "https://www.distanza.org/route.json?stops=" + args.locda + "|" + args.loca,
      method: 'GET'
    }, function (error, response, body) {
      if (response.statusCode === 404 || error) {
        let err = bot.util.embed().setColor(0xC80000)
          .setDescription(`***La distanza da \`${args.locda}\` a \`${args.loca}\` non è disponibile !***`);
        message.channel.send({ embed: err });
      } else if (!error && response.statusCode === 200) {
        let all = JSON.parse(body);
        let dis = bot.util.embed().setColor(0x00AE86).setTimestamp().setFooter("© AlweNoBot by zAlweNy26#1059")
          .setAuthor(`Info sulla distanza tra due località :`, bot.user.avatarURL)
          .addField("Distanza calcolata", all.stops[0].translations.it + "\n--- A ---\n" + all.stops[1].translations.it, true)
          .addField("Località n.1", all.stops[0].translations.it + ",\n" + all.stops[0].region + ",\n" + mine.getCountryName(all.stops[0].countryCode), true)
          .addField("Località n.2", all.stops[1].translations.it + ",\n" + all.stops[1].region + ",\n" + mine.getCountryName(all.stops[1].countryCode), true)
          .addField("Distanza in linea d\'aria", all.distance + " km", true)
          .addField("Popolazione n.1", parseInt(all.stops[0].wikipedia.population).toLocaleString().replace(",", ".") + " abitanti", true)
          .addField("Popolazione n.2", parseInt(all.stops[1].wikipedia.population).toLocaleString().replace(",", ".") + " abitanti", true);
        message.channel.send({ embed: dis });
      }
    })
  }
}

module.exports = Distance;