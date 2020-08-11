const config = require("./../../config.json");
const mine = require('./../../functions.js');
const { Command } = require('discord-akairo');
const Discord = require("discord.js");
const request = require("request");
const _ = require("underscore");

class SRKPlayer extends Command {
    constructor() {
        super('srk', {
           aliases: ['srk'],
           ownerOnly: false,
           channelRestriction: 'guild',
           category: 'Misc',
           typing: false,
           userPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
           clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
           args: [{
    				 id: 'player',
             type: 'lowercase',
    				 prompt: {
               start: '***questo comando ha bisogno di un argomento (***\`[giocatore]\`***) per funzionare.***',
               retry: '***devi inserire un argomento (***\`[giocatore]\`***) valido !***',
               ended: '***tentativi massimi raggiunti per utilizzare questo comando. Comando cancellato.***',
               timeout: '***tempo scaduto per inserire un argomento (***\`[giocatore]\`***) valido.***'
    				 }
    			 }],
           description: {
             content: '*Mostra informazioni sul giocatore di picchiaduro* **[giocatore]**\n**ATTENZIONE** : per nomi formati da più parole, inserire \'_\' al posto degli spazi.',
             usage: config.prefix + 'srk [giocatore]',
             examples: [config.prefix + 'srk Bonchan', config.prefix + 'srk Daigo_Umehara']
           }
        });
    }

    exec(message, args) {
      let bot = this.client, player = "";
      for (let i = 0; i < args.player.length; i++) {
        if (args.player.charAt(i) === '_') player = player + " ";
        else player = player + args.player.charAt(i);
      }
      request({
        url: "http://rank.shoryuken.com/api/player/name/" + player,
        method: 'GET'
      }, function (error, response, body) {
        if (response.statusCode === 404 || error || _.isEqual(JSON.parse(body), JSON.parse("{}"))) {
          let err = bot.util.embed().setColor(0xC80000)
            .setDescription(`***L'utente \`${player}\` non è presente nel database di Shoryuken.com !***`);
          message.channel.send({embed: err});
        } else if (!error && response.statusCode === 200) {
          let srkpl = JSON.parse(body), rname = "Non disponibile", teams = "Nessuno sponsor", torns = "Nessuno", rankg = 0, ranks = "", places = "";
          if (srkpl.realname != "") rname = srkpl.realname;
          if (!_.isEqual(srkpl.teams, JSON.parse("[]"))) {
            teams = "";
            srkpl.teams.forEach(function(element) {
              teams = element + "\n" + teams;
            });
          }
          if (srkpl.results !== undefined) torns = Object.keys(srkpl.results).length;
          if (srkpl.rankings !== undefined) rankg = Object.keys(srkpl.rankings).length;
          if (torns > 0) {
            for (let i = 0; i < torns; i++) {
              places = `\`${srkpl.results[i].place}\`° : \`${srkpl.results[i].tournamentname}\`\n` + places;
              if (i == 8) break;
            }
            if (torns > 9) places = places + `e altri \`${torns-9}\` tornei...`
          } else places = "Nessun torneo";
          for (let i = 0; i < rankg; i++) {
            ranks = `\`${srkpl.rankings[Object.getOwnPropertyNames(srkpl.rankings)[i]].rank}\`° : \`${Object.getOwnPropertyNames(srkpl.rankings)[i]}\`\n` + ranks;
          }
          let srk = bot.util.embed().setColor(`RANDOM`).setTimestamp().setFooter("© AlweNoBot by zAlweNy26#1059")
            .setAuthor(`Dati su ${srkpl.name}`, bot.user.avatarURL)
            .addField("Nome", rname, true)
            .addField("Gioco principale", srkpl.mainGame, true)
            .addField("Tornei partecipati", torns, true)
            .addField("Punti Capcom Pro Tour", srkpl.cptScore, true)
            .addField("Paese", mine.getCountryName(srkpl.country), true)
            .addField("Sponsors", teams, true)
            .addField("Rank nei giochi", ranks, true)
            .addField("Posizionamento nei tornei", places, true)
          message.channel.send({embed: srk});
        }
      })
    }
}

module.exports = SRKPlayer;
