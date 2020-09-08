const Discord = require('discord.js')

module.exports = {
  	name: 'info',
  	description: '*Mostra informazioni su un utente/bot del server o su te stesso.*',
  	aliases: ['i'],
  	category: 'Info',
  	usage: '[@utente]',
  	userPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
	guildOnly: true,
	ownerOnly: false,
	examples: ['info @Example', 'i @Test'],
	args: 1,
	execute(message, args) {
		let user = message.mentions.users.first(), nick = "Inesistente"
		if (!args.length) user = message.author
		if (message.guild.members.cache.get(user.id).nickname != null) nick = message.guild.members.cache.get(user.id).nickname
		const dateTimeFormat = new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: 'numeric', minute: 'numeric', })
		const [{ value: day1 },,{ value: month1 },,{ value: year1 },,{ value: hour1 },,{ value: minute1 }] = dateTimeFormat.formatToParts(user.createdAt) 
		const [{ value: day },,{ value: month },,{ value: year },,{ value: hour },,{ value: minute }] = dateTimeFormat.formatToParts(message.guild.members.cache.get(user.id).joinedAt) 
        const userinfo = new Discord.MessageEmbed()
            .setColor('#00AE86')
            .setAuthor("Informazioni su " + user.username, message.client.user.avatarURL())
            .setThumbnail(user.avatarURL({ format: 'png', dynamic: true, size: 4096 }))
            .addField("Nome", user.tag, true)
            .addField("Discriminatore", "#" + user.discriminator, true)
            .addField("Soprannome", nick, true)
			.addField("Account creato il", `${month1}/${day1}/${year1} alle ${hour1}:${minute1}`, true)
			.addField("Entrato il", `${month}/${day}/${year} alle ${hour}:${minute}`, true)
			.addField("Ruoli", message.guild.members.cache.get(user.id).roles.cache.size - 1, true)
        message.channel.send(userinfo)
	},
}