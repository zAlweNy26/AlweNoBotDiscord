const config = require("./../../config.json");
const mine = require('./../../functions.js');
const { Command } = require('discord-akairo');
const Discord = require("discord.js");
const overwatch = require('overwatch-api'); 

class OverwatchStats extends Command {
  constructor() {
    super('overwatch', {
      aliases: ['overwatch', 'ow'],
      ownerOnly: false,
      channelRestriction: 'guild',
      category: 'Misc',
      typing: false,
      userPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
      clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
      args: [
        {
          id: 'pf',
          type: 'lowercase',
          prompt: {
            start: '***questo comando ha bisogno che l argomento sia uguale a \`XBL\`, \`PSN\` o \`PC\` per funzionare.***',
            retry: '***devi inserire un argomento \`XBL\`, \`PSN\` o \`PC\` !***',
            ended: '***tentativi massimi raggiunti per utilizzare questo comando. Comando cancellato.***',
            timeout: '***tempo scaduto per inserire un argomento valido.***'
          }
        },
        {
          id: 'name',
          type: 'string',
          prompt: {
            start: '***questo comando ha bisogno di un argomento (***\`[nickname]\`***) per funzionare.***',
            retry: '***devi inserire un argomento (***\`[nickname]\`***) valido !***',
            ended: '***tentativi massimi raggiunti per utilizzare questo comando. Comando cancellato.***',
            timeout: '***tempo scaduto per inserire un argomento (***\`[nickname]\`***) valido.***'
          }
        }
      ],
      description: {
        content: '*Mostra informazioni sull account di Overwatch di* **[nickname]**',
        usage: config.prefix + 'overwatch [piattaforma] [nickname]',
        examples: [config.prefix + 'overwatch psn Mortal', config.prefix + 'ow pc osryde#2700']
      }
    });
  }

  exec(message, args) {
    let bot = this.client, pf = args.pf.toUpperCase(), nick = args.name, pfs = ["XBL", "PSN", "PC"];
    if (pfs.includes(pf) == false) {
      let abbr = "";
      for (let i = 0; i < pfs.length; i++) {
        if (i === 0) abbr = `\`${pfs[i]}\``;
        else abbr = `\`${pfs[i]}\`` + `*,* ${abbr}`;
      }
      let err = bot.util.embed().setColor(0xC80000)
        .setDescription(`***Le abbreviazioni disponibili per le piattaforme sono :*** \`` + abbr + `\``);
      message.channel.send({ embed: err });
    } else {
      request('https://playoverwatch.com/it-it/career/' + pf.toLowerCase() + '/' + nick.replace("#", "-"), function (error, response, html) {
        if (error || response.statusCode != 200) {
          let err = bot.util.embed().setColor(0xC80000)
            .setDescription(`***L'utente inserito non è presente nei database di Overwatch !***`);
          message.channel.send({ embed: err });
        } else {
          const $ = cheerio.load(html)
          let permission = $('.masthead-permission-level-text').text();
          let timenorm = $('#quickplay td:contains("Tempo di gioco")').next().html();
          let timecomp = $('#competitive td:contains("Tempo di gioco")').next().html();
          let playedcomp = parseInt($('#competitive td:contains("Partite giocate")').next().html());
          let won = parseInt($('#competitive td:contains("Partite vinte")').next().html());
          let lost = parseInt($('#competitive td:contains("Partite perse")').next().html());
          let draw = parseInt($('#competitive td:contains("Partite pareggiate")').next().html());
          let solokcomp = parseInt($('#competitive td:contains("Uccisioni solitarie")').next().html());
          let kcomp = parseInt($("#competitive td:contains('Eliminazioni')").filter(function() {
            return $(this).text().toLowerCase() == "eliminazioni";
          }).next().html());
          let dcomp = parseInt($('#competitive td:contains("Morti")').next().html());
          let acomp = kcomp - solokcomp;
          let kmed = parseFloat(kcomp/playedcomp).toFixed(1);
          let dmed = parseFloat(dcomp/playedcomp).toFixed(1);
          let amed = parseFloat(acomp/playedcomp).toFixed(1);
          let kda = parseFloat(((solokcomp + (1 / 3 * acomp)) - dcomp) / playedcomp).toFixed(2);
          let winrate = parseFloat(won / (playedcomp - draw) * 100).toFixed(2);
          let owinfo = bot.util.embed().setColor(0x00AE86).setTimestamp().setFooter("© AlweNoBot by zAlweNy26#1059", bot.user.avatarURL)
            .setAuthor(`Dati su ${$('.header-masthead').text()}`)
            .setThumbnail($('.player-portrait').attr('src'))
            .addField("Livello", $('.player-level div').first().text(), true)
            .addField("Ore spese (normali)", `${timenorm} ore`, true)
            .addField("Ore spese (Classificate)", `${timecomp} ore`, true)
            .addField("W/D/L (Classificate)", `${won} / ${draw} / ${lost}`, true)
            .addField("Media K/D/A (Classificate)", `${kmed} / ${dmed} / ${amed}`, true)
            .addField("KDA Rateo (Classificate)", kda, true)
            .addField("Winrate (Classificate)", winrate + " %", true);
          message.channel.send({ embed: owinfo });
        }
      });
    }
  }
}

module.exports = OverwatchStats;