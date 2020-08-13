const Discord = require("discord.js")
const weather = require('weather-js')

module.exports = {
  	name: 'weather',
  	description: '*Mostra informazioni meteo della località inserita*',
  	aliases: ['wt'],
  	category: 'Misc',
  	usage: '[località]',
  	userPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
    guildOnly: true,
    ownerOnly: false,
    examples: ['weather Milano', 'wt Parigi'],
    args: -1,
    execute(message, args) {
        weather.find({search: args.join(" "), degreeType: 'C', lang: 'it-IT'}, function(err, result) {
            if (err || result[0] === undefined) {
                let noloc = new Discord.MessageEmbed().setColor(0xC80000)
                    .setDescription(`***Il luogo \`${args.join(" ")}\` non è stato trovato.***`)
                message.channel.send(noloc)
            } else {
                let current = result[0].current, location = result[0].location
                let weather = new Discord.MessageEmbed().setColor(0x00AE86)
                    .setThumbnail(current.imageUrl)
                    .setAuthor(`Info su ${current.observationpoint}`)
                    .addField('Coordinate', `Latitudine : ${location.lat}\nLongitudine : ${location.long}`, true)
                    .addField('Fuso orario', `UTC${location.timezone}\n${current.observationtime}`, true)
                    .addField('Temperatura', `${current.temperature} ° C`, true)
                    .addField('Tempo', current.skytext, true)
                    .addField('Vento', current.winddisplay, true)
                    .addField('Umidità', `${current.humidity} %`, true)
                message.channel.send(weather)
            }
        })
    },
}
