const Discord = require('discord.js')
const request = require("request")
const _ = require("underscore")

module.exports = {
  	name: 'crypto',
  	description: '*Mostra informazioni sulla cryptovaluta inserita*',
  	aliases: ['cp'],
  	category: 'Misc',
  	usage: '[moneta]',
  	userPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
    guildOnly: true,
    ownerOnly: false,
    examples: ['crypto bitcoin', 'crypto ethereum'],
    args: 1,
    execute(message, args) {
        request({
            url: "https://api.coingecko.com/api/v3/coins/markets?vs_currency=eur&ids=" + args[0],
            method: 'GET'
        }, function (error, response, body) {
            if (response.statusCode === 404 || error || _.isEqual(JSON.parse(body), JSON.parse("[]"))) {
                let err = new Discord.MessageEmbed().setColor('#C80000')
                    .setDescription(`***La cryptomoneta \`${args[0]}\` non esiste, controlla l'ortografia e riprova !***`)
                message.channel.send(err)
            } else if (!error && response.statusCode === 200) {
                let all = JSON.parse(body)
                let crypto = new Discord.MessageEmbed().setColor('#00AE86')
                    .setAuthor(`Dati sulla cryptomoneta ${all[0].name} (${all[0].symbol.toUpperCase()})`)
                    .setThumbnail(all[0].image)
                    .addField("Prezzo", "€ " + parseFloat(all[0].current_price).toFixed(2), true)
                    .addField("Prezzo in 24h", parseFloat(all[0].price_change_percentage_24h).toFixed(2) + " %", true)
                    .addField("Prezzo più alto in 24h", "€ " + parseFloat(all[0].high_24h).toFixed(2), true)
                    .addField("Prezzo più basso in 24h", "€ " + parseFloat(all[0].low_24h).toFixed(2), true)
                message.channel.send(crypto)
            }
        })
	  },
}
