const config = require("./../../config.json");
const mine = require('./../../functions.js');
const { Command } = require('discord-akairo');
const Discord = require("discord.js");
const request = require("request");

class YoutubeInfo extends Command {
    constructor() {
        super('ytinfo', {
           aliases: ['ytinfo'],
           ownerOnly: false,
           channelRestriction: 'guild',
           category: 'Misc',
           typing: false,
           userPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
           clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
           args: [
             {
      				 id: 'idname',
               type: 'lowercase',
      				 prompt: {
                 start: '***questo comando ha bisogno che l argomento sia uguale a \`id\` o a \`name\` per funzionare.***',
                 retry: '***devi inserire un argomento \`id\` o \`name\` !***',
                 ended: '***tentativi massimi raggiunti per utilizzare questo comando. Comando cancellato.***',
                 timeout: '***tempo scaduto per inserire un argomento valido.***'
      				 }
    			   },
             {
      				 id: 'value',
               type: 'string',
      				 prompt: {
                 start: '***questo comando ha bisogno di un argomento (***\`[valore]\`***) per funzionare.***',
                 retry: '***devi inserire un argomento (***\`[valore]\`***) valido !***',
                 ended: '***tentativi massimi raggiunti per utilizzare questo comando. Comando cancellato.***',
                 timeout: '***tempo scaduto per inserire un argomento (***\`[valore]\`***) valido.***'
      				 }
    			   }
           ],
           description: {
             content: '*Mostra informazioni sul canale Youtube* **[valore]**',
             usage: config.prefix + 'ytinfo [name/id] [valore]',
             examples: [config.prefix + 'ytinfo name testchannel', config.prefix + 'ytinfo id n4nj234b2h34-432b4u2']
           }
        });
    }

    exec(message, args) {
      let bot = this.client, urliduser = "";
      if (args.idname === "name" || args.idname === "id") {
        if (args.idname === "name") urliduser = "https://www.googleapis.com/youtube/v3/channels?part=snippet%2Cstatistics&forUsername="
        else if (args.idname === "id") urliduser = "https://www.googleapis.com/youtube/v3/channels?part=snippet%2Cstatistics&id=";
        request({
          url: urliduser + args.value + "&key=" + process.env.ytAPIkey,
          method: 'GET'
        }, function (error, response, body) {
          let yt = JSON.parse(body);
          if (response.statusCode === 404 || error || yt.pageInfo.totalResults === 0) {
            let err = bot.util.embed().setColor(0xC80000)
              .setDescription(`***Il canale \`${args.value}\` non esiste, controlla l'ortografia e riprova !***`);
            message.channel.send({embed: err});
          } else if (!error && response.statusCode === 200) {
            let subs = "0", hsubs = "Sì", desc = "Non disponibile";
            if (yt.items[0].statistics.hiddenSubscriberCount === false) {
              subs = yt.items[0].statistics.subscriberCount;
              hsubs = "No";
            }
            if (yt.items[0].snippet.description != "") desc = yt.items[0].snippet.description;
            let ytinfo = bot.util.embed().setColor(0xFF0000).setTimestamp().setFooter("© AlweNoBot by zAlweNy26#1059")
              .setAuthor(`Dati sul canale Youtube ${yt.items[0].snippet.title}`, bot.user.avatarURL)
              .setThumbnail(yt.items[0].snippet.thumbnails.default.url)
              .addField("Paese", mine.getCountryName(yt.items[0].snippet.country), true)
              .addField("Creato il", mine.IsoConv(yt.items[0].snippet.publishedAt), true)
              .addField("Visualizzazioni totali", parseInt(yt.items[0].statistics.viewCount).toLocaleString(), true)
              .addField("Video totali", parseInt(yt.items[0].statistics.videoCount).toLocaleString() + " video", true)
              .addField("Iscritti", parseInt(subs).toLocaleString(), true)
              .addField("Iscritti nascosti", hsubs, true)
              .addField("Descrizione", desc, true);
            message.channel.send({embed: ytinfo});
          }
        })
      } else if (args.idname !== "name" || args.idname !== "id") {
        let noidname = bot.util.embed().setColor(0xC80000)
          .setDescription(`\`${args.idname}\` ***deve essere uguale a \`id\` o a \`name\` !***`);
        message.channel.send({embed: noidname});
      }
    }
}

module.exports = YoutubeInfo;
