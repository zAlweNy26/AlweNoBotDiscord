const Discord = require('discord.js')

module.exports = {
  	name: 'server',
  	description: '*Mostra informazioni sul server in cui viene eseguito*',
  	aliases: ['sv'],
  	category: 'Info',
  	usage: '',
  	userPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
	guildOnly: true,
	ownerOnly: false,
	examples: ['server', 'sv'],
	args: 0,
	execute(message, args) {
        let server = new Discord.MessageEmbed()
            .setColor('#00AE86')
            .setAuthor("Info su " + message.channel.guild.name, message.client.user.avatarURL)
            .setThumbnail(message.channel.guild.iconURL)
            .addField("Server ID", message.channel.guild.id, true)
            .addField("Creato da", `<@${message.channel.guild.ownerID}>`, true)
            .addField("Membri", message.channel.guild.presences.cache.size + " / " + message.channel.guild.members.cache.size + " 👥", true)
            .addField("Ruoli", message.channel.guild.roles.cache.size - 1, true)
            .addField("Canale AFK", `<#${message.channel.guild.afkChannelID}>`, true)
            .addField("Ospitato in", message.channel.guild.region.charAt(0).toUpperCase() + message.channel.guild.region.slice(1), true)
        message.channel.send(server)
	},
}
