const Discord = require("discord.js")
const request = require("request")

module.exports = {
  	name: 'distance',
  	description: '*Mostra informazioni sulla distanza tra una località e un\'altra.*',
  	aliases: ['dt'],
  	category: 'Misc',
  	usage: '[mezzo] [ottimizzazione] [partenza] [destinazione]',
  	userPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
    guildOnly: true,
    ownerOnly: false,
    examples: ['dt auto distanza Trapani|Torino', 'distance piedi tempo Milano|Roma'],
    args: -1,
    execute(message, args) {
        const travelMode = ["auto", "piedi"], distanceMode = ["tempo", "distanza"]

        if (args.length <= 2) {
            let err = new Discord.MessageEmbed().setColor('#C80000')
                .setDescription(`***Non è stato possibile effettuare un itinerario con i seguenti argomenti !***`)
            return message.channel.send(err)
        }

        if (travelMode.includes(args[0].toLowerCase()) == false) {
            let abbr = ""
            for (let i = 0; i < travelMode.length; i++) {
                if (i === 0) abbr = travelMode[i] + abbr
                else abbr = travelMode[i] + ", " + abbr
            }
            let err = new Discord.MessageEmbed().setColor(0xC80000)
                .setDescription(`***Le modalità di viaggio disponibili sono :*** \`` + abbr + `\``)
            return message.channel.send(err)
        }

        if (distanceMode.includes(args[1].toLowerCase()) == false) {
            let abbr = ""
            for (let i = 0; i < distanceMode.length; i++) {
                if (i === 0) abbr = distanceMode[i] + abbr
                else abbr = distanceMode[i] + ", " + abbr
            }
            let err = new Discord.MessageEmbed().setColor(0xC80000)
                .setDescription(`***Le modalità di ottimizzazione disponibili sono :*** \`` + abbr + `\``)
            return message.channel.send(err)
        }

        let tm, opt, wp1, wp2

        if (args[0].toLowerCase() == travelMode[0]) tm = 'Driving'
        else if (args[0].toLowerCase() == travelMode[1]) tm = 'Walking'

        if (args[1].toLowerCase() == distanceMode[0]) opt = 'time'
        else if (args[1].toLowerCase() == distanceMode[1]) opt = 'distance'

        wp1 = message.content.substring(message.content.split(" ", 3).join(" ").length + 1, message.content.indexOf("|")).replace(/ /g, "%20")
        wp2 = message.content.substring(message.content.indexOf("|") + 1, message.content.length).replace(/ /g, "%20")

        request({
            url: `https://dev.virtualearth.net/REST/V1/Routes/${tm}?wp.0=${wp1}&wp.1=${wp2}&optmz=${opt}&output=json&key=${process.env.bingAPI}`,
            method: 'GET'
        }, function (error, response, body) {
            let all = JSON.parse(body)
            if (response.statusCode === 404 || error) {
                if (all.errorDetails[0] == "The route distance is too long to calculate a route.") {
                    let err = new Discord.MessageEmbed().setColor('#C80000')
                        .setDescription(`***La distanza è troppa per poter calcolare un itinerario***`)
                    message.channel.send(err)
                } else {
                    let err = new Discord.MessageEmbed().setColor('#C80000')
                        .setDescription(`***Non è stato possibile effettuare un itinerario con i seguenti argomenti !***`)
                    message.channel.send(err)
                }
            } else if (!error && response.statusCode === 200) {
                let dist = new Discord.MessageEmbed().setColor('#00AE86')
                    .setAuthor(`Itinerario`)
                    .addField("Distanza", `${(all.resourceSets[0].resources[0].travelDistance).toFixed(2)} km`, true)
                    .addField("Durata stimata", `${((all.resourceSets[0].resources[0].travelDuration) / 60).toFixed(2)} minuti`, true)
                    .addField("Durata con traffico stimata", `${((all.resourceSets[0].resources[0].travelDurationTraffic) / 60).toFixed(2)} minuti`, true)
                    .addField("Mezzo usato", args[0].charAt(0).toUpperCase() + args[0].slice(1).toLowerCase(), true)
                    .addField("Località di partenza", all.resourceSets[0].resources[0].routeLegs[0].startLocation.name, true)
                    .addField("Località di destinazione", all.resourceSets[0].resources[0].routeLegs[0].endLocation.name, true)
                message.channel.send(dist)
            }
        })
    },
}
