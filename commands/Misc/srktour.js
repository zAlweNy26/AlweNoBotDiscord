const config = require("./../../config.json");
const mine = require('./../../functions.js');
const { Command } = require('discord-akairo');
const Discord = require("discord.js");
const request = require("request");
const _ = require("underscore");

class SRKTournament extends Command {
    constructor() {
        super('srktour', {
           aliases: ['srktour', 'srkt'],
           ownerOnly: false,
           channelRestriction: 'guild',
           category: 'Misc',
           typing: false,
           userPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
           clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
           args: [{
    				 id: 'tour',
             type: 'lowercase',
    				 prompt: {
               start: '***questo comando ha bisogno di un argomento (***\`[torneo]\`***) per funzionare.***',
               retry: '***devi inserire un argomento (***\`[torneo]\`***) valido !***',
               ended: '***tentativi massimi raggiunti per utilizzare questo comando. Comando cancellato.***',
               timeout: '***tempo scaduto per inserire un argomento (***\`[torneo]\`***) valido.***'
    				 }
    			 }],
           description: {
             content: '*Mostra informazioni sul torneo di picchiaduro* **[torneo]**\n**ATTENZIONE** : per nomi formati da più parole, inserire \'_\' al posto degli spazi.',
             usage: config.prefix + 'srktour [torneo]',
             examples: [config.prefix + 'srkt The_Colosseum_2018_-_DBZ', config.prefix + 'srktour Evolution_2018_-_SF5']
           }
        });
    }

    exec(message, args) {
      let bot = this.client, tour = "";
      for (let i = 0; i < args.tour.length; i++) {
        if (args.tour.charAt(i) === '_') tour = tour + " ";
        else tour = tour + args.tour.charAt(i);
      }
      request({
        url: "http://rank.shoryuken.com/api/tournament/name/" + tour,
        method: 'GET'
      }, function (error, response, body) {
        if (response.statusCode === 404 || error || _.isEqual(JSON.parse(body), JSON.parse("{}"))) {
          const err = bot.util.embed().setColor(0xC80000)
            .setDescription(`***Il torneo \`${tour}\` non è presente nel database di shoryuken.com !***`);
          message.channel.send({embed: err});
        } else if (!error && response.statusCode === 200) {
          let srktour = JSON.parse(body), tens = "", players = 0, tenspl;
          if (srktour.results !== undefined) players = Object.keys(srktour.results).length;
          tenspl = srktour.results.filter(function(item) { return item.place === 1; });
          tens = tens + `\`${tenspl[0].place}\`° : \`${tenspl[0].playername}\` | `;
          tenspl = srktour.results.filter(function(item) { return item.place === 2; });
          tens = tens + `\`${tenspl[0].place}\`° : \`${tenspl[0].playername}\` | `;
          tenspl = srktour.results.filter(function(item) { return item.place === 3; });
          tens = tens + `\`${tenspl[0].place}\`° : \`${tenspl[0].playername}\` `;
          if (players > 3) tens = tens + `e altri \`${players-3}\` giocatori...`
          const srk = bot.util.embed().setColor(`RANDOM`).setTimestamp().setFooter("© AlweNoBot by zAlweNy26#1059")
            .setAuthor(`Dati sul torneo ${srktour.name}`, bot.user.avatarURL)
            .addField("Svoltosi in", mine.getCountryName(srktour.country), true)
            .addField("Svoltosi il", mine.SRKTourDate(srktour.date), true)
            .addField("Partecipanti", players, true)
            .addField("Primi 3 classificati", tens, false)
          message.channel.send({embed: srk});
        }
      })
    }
}

module.exports = SRKTournament;
