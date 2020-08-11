const config = require("./../../config.json");
const mine = require('./../../functions.js');
const { Command } = require('discord-akairo');
const Discord = require("discord.js");

class UserInfo extends Command {
    constructor() {
        super('info', {
           aliases: ['info'],
           ownerOnly: false,
           channelRestriction: 'guild',
           category: 'Info',
           typing: false,
           userPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
           clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
           args: [{
    				 id: 'user',
             type: 'memberMention',
    				 prompt: {
               start: '***questo comando ha bisogno di una menzione (***\`@[utente]\`***) per funzionare.***',
               retry: '***devi inserire una menzione (***\`@[utente]\`***) valida !***',
               ended: '***tentativi massimi raggiunti per utilizzare questo comando. Comando cancellato.***',
               timeout: '***tempo scaduto per inserire una menzione (***\`@[utente]\`***) valida.***'
    				 }
    			 }],
           description: {
             content: '*Mostra informazioni su un utente/bot del server o su te stesso*',
             usage: config.prefix + 'info @[utente]',
             examples: [config.prefix + 'info @Example', config.prefix + 'info @Test']
           }
        });
    }

    exec(message) {
            let user = message.mentions.users.first(), userCreated = user.createdAt.toString().split(" "), nick = "Inesistente";
        if (message.guild.members.get(user.id).nickname != null) nick = message.guild.members.get(user.id).nickname;
			let userinfo = this.client.util.embed().setColor(0x00AE86).setTimestamp().setFooter("© AlweNoBot by zAlweNy26#1059")
				.setAuthor("Informazioni su " + user.username, this.client.user.avatarURL)
				.setThumbnail(user.avatarURL)
				.addField("ID Utente", user.id, true)
				.addField("Discriminatore Utente", "#" + user.discriminator, true)
                .addField("Soprannome", nick, true)
                .addField("Account creato il", `${userCreated[2]} ${userCreated[1]}. ${userCreated[3]} ${userCreated[4]}`, true);
			message.channel.send({embed: userinfo});
    }
}

module.exports = UserInfo;
