const mine = require('./../functions.js')
const Discord = require("discord.js")
const request = require("request")

module.exports = {
  	name: 'ytinfo',
  	description: '*Mostra informazioni sul canale Youtube inserito*',
  	aliases: ['ytf'],
  	category: 'Misc',
  	usage: '[nome/id] [valore]',
  	userPermissions: ['SEND_MESSAGES', 'EMBED_LINKS', 'ADMINISTRATOR'],
    guildOnly: true,
    ownerOnly: false,
    examples: ['ytinfo nome testchannel', 'ytinfo id n4nj234b2h34-432b4u2'],
    args: -1,
    execute(message, args) {
        let urliduser = ""
        if (args[0] === "nome" || args[0] === "id") {
            if (args[0] === "nome") urliduser = "https://www.googleapis.com/youtube/v3/channels?part=snippet%2Cstatistics&forUsername="
            else if (args[0] === "id") urliduser = "https://www.googleapis.com/youtube/v3/channels?part=snippet%2Cstatistics&id="
            request({
                url: urliduser + args[1] + "&key=" + process.env.ytAPIkey,
                method: 'GET'
            }, function (error, response, body) {
                let yt = JSON.parse(body)
                if (response.statusCode === 404 || error || yt.pageInfo.totalResults === 0) {
                    let err = new Discord.MessageEmbed().setColor(0xC80000)
                        .setDescription(`***Il canale \`${args[1]}\` non esiste, controlla l'ortografia e riprova !***`)
                    message.channel.send(err)
                } else if (!error && response.statusCode === 200) {
                    let subs = "0", hsubs = "Sì", desc = "Non disponibile"
                    if (yt.items[0].statistics.hiddenSubscriberCount === false) {
                        subs = yt.items[0].statistics.subscriberCount
                        hsubs = "No"
                    }
                    if (yt.items[0].snippet.description != "") desc = yt.items[0].snippet.description
                    let ytinfo = new Discord.MessageEmbed().setColor(0xFF0000)
                        .setAuthor(`Dati sul canale Youtube ${yt.items[0].snippet.title}`)
                        .setThumbnail(yt.items[0].snippet.thumbnails.default.url)
                        .addField("Paese", mine.getCountryName(yt.items[0].snippet.country), true)
                        .addField("Creato il", mine.IsoConv(yt.items[0].snippet.publishedAt), true)
                        .addField("Visualizzazioni totali", parseInt(yt.items[0].statistics.viewCount).toLocaleString(), true)
                        .addField("Video totali", parseInt(yt.items[0].statistics.videoCount).toLocaleString() + " video", true)
                        .addField("Iscritti", parseInt(subs).toLocaleString(), true)
                        .addField("Iscritti nascosti", hsubs, true)
                        .addField("Descrizione", desc, true)
                    message.channel.send(ytinfo)
                }
            })
        } else {
            let noidname = new Discord.MessageEmbed().setColor(0xC80000)
                .setDescription(`***Il primo argomento deve essere uguale a \`id\` o a \`nome\` !***`)
            message.channel.send(noidname)
        }
    },
}
