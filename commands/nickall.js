const Discord = require("discord.js");

module.exports = {
  	name: 'nickall',
  	description: '*Cambia il nickname a tutti gli utenti del server. Se inviato senza argomenti, resetta tutti i nickname.* ***[SOLO PER IL PROPRIETARIO DEL SERVER]***',
  	aliases: ['na'],
  	category: 'Mod',
  	usage: '<nickname>',
  	userPermissions: ['SEND_MESSAGES', 'EMBED_LINKS', 'MANAGE_NICKNAMES'],
    guildOnly: true,
    ownerOnly: false,
    examples: ['nickall Idiota', 'na Utente | {{username}}', 'na'],
    args: 0,
    execute(message, args) {
        if (message.guild.me.hasPermission("MANAGE_NICKNAMES") && message.member.id == message.guild.ownerID) {
            if (!args.length) message.guild.members.cache.forEach(m => {
                if (m.id != message.guild.ownerID) 
                    m.setNickname(m.user.username)
            })
            else message.guild.members.cache.forEach(m => {
                if (m.id != message.guild.ownerID) 
                    m.setNickname(message.content.substring(message.content.indexOf(" ") + 1, message.content.length).replace("{{username}}", m.user.username))
            })
            const endchange = new Discord.MessageEmbed()
                .setColor(0x00DC00)
                .setDescription("✅ ***Nicknames cambiati con successo !***")
            message.channel.send(endchange)
        } else {
            const noown = new Discord.MessageEmbed()
                .setColor(0xC80000)
                .setDescription("⛔ ***Non hai accesso a questo comando, poichè non sei il proprietario di questo server !***")
            message.channel.send(noown)
        }
    },
}
