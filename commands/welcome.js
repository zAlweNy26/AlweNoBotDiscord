const Discord = require('discord.js')

module.exports = {
  	name: 'welcome',
  	description: '*Mostra un messaggio di benvenuto per ogni utente che entra.*',
  	aliases: ['wm'],
  	category: 'Info',
  	usage: '[id canale] [messaggio]',
  	userPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
	guildOnly: true,
	ownerOnly: false,
	examples: ['welcome 742811567988539554 Benvenuto {{utente}} !', 'wm 742811567988539554 Ehy {{utente}} !'],
	args: -1,
	execute(message, args) {
		const wmEmbed = new Discord.MessageEmbed()

		if (args[0] == 'delete') {
			message.client.settings.set(message.guild.id, false, "welcome")
			wmEmbed.setColor(0xC80000).setDescription(`*Hai eliminato il messaggio di addio !*`)
			return message.channel.send(wmEmbed)
		}
		
		if (isNaN(args[0])) {
			wmEmbed.setColor(0xC80000).setDescription(`*Non hai inserito un ID canale valido !*`)
			return message.channel.send(wmEmbed)
		}

		let channelID = args[0]
		args[0] = ''

		if (!message.guild.channels.cache.some((channel) => channel.id === channelID)) {
			wmEmbed.setColor(0xC80000).setDescription(`*Non hai inserito un ID canale esistente !*`)
			return message.channel.send(wmEmbed)
		}

		message.client.settings.set(message.guild.id, true, "welcome")
		message.client.settings.set(message.guild.id, channelID, "welcomeID")
		message.client.settings.set(message.guild.id, args.join(" "), "welcomeMessage")

		wmEmbed.setColor('#00AE86').setDescription(`*Messaggio di benvenuto creato !*`)
		message.channel.send(wmEmbed)
		setTimeout(() => { message.channel.bulkDelete(1).catch(err => { console.error(err) }) }, 2000)
	},
}