const config = require("./../../config.json");
const mine = require('./../../functions.js');
const { Command } = require('discord-akairo');
const Discord = require("discord.js");
const weather = require('weather-js');

class Weather extends Command {
    constructor() {
        super('weather', {
           aliases: ['weather', 'wt'],
           ownerOnly: false,
           channelRestriction: 'guild',
           category: 'Misc',
           typing: false,
           userPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
           clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
           /*args: [{
    				 id: 'loc',
             type: 'lowercase',
    				 prompt: {
               start: '***questo comando ha bisogno di un argomento (***\`[località]\`***) per funzionare.***',
               retry: '***devi inserire un argomento (***\`[località]\`***) valido !***',
               ended: '***tentativi massimi raggiunti per utilizzare questo comando. Comando cancellato.***',
               timeout: '***tempo scaduto per inserire un argomento (***\`[località]\`***) valido.***'
    				 }
    			 }],*/
           description: {
             content: '*Mostra informazioni meteo della* **[località]**',
             usage: config.prefix + 'weather [località]',
             examples: [config.prefix + 'weather Milano', config.prefix + 'wt Parigi']
           }
        });
    }

    exec(message, args) {
      let bot = this.client;
      let loc = message.content.substring(message.content.indexOf(" ") + 1);
      weather.find({search: loc, degreeType: 'C', lang: 'it-IT'}, function(err, result) {
        if (err || result[0] === undefined) {
          let noloc = bot.util.embed().setColor(0xC80000)
            .setDescription(`***Il luogo \`${loc}\` non è stato trovato.***`);
          message.channel.send({embed: noloc});
        } else {
          let current = result[0].current, location = result[0].location;
          let weather = bot.util.embed().setColor(0x00AE86)
            .setThumbnail(current.imageUrl)
            .setAuthor(`Info su ${current.observationpoint}`)
            .addField('Coordinate', `Latitudine : ${location.lat}\nLongitudine : ${location.long}`, true)
            .addField('Fuso orario', `UTC${location.timezone}\n${current.observationtime}`, true)
            .addField('Temperatura', `${current.temperature} ° C`, true)
            .addField('Tempo', current.skytext, true)
            .addField('Vento', current.winddisplay, true)
            .addField('Umidità', `${current.humidity} %`, true);
          message.channel.send({embed: weather});
        }
      });
    }
}

module.exports = Weather;
