const config = require("./../config.json");
const mine = require('./../functions.js');
const { Command } = require('discord-akairo');
const Discord = require("discord.js");

class Help extends Command {
    constructor() {
      	super('help', {
      		 aliases: ['help', 'h'],
           ownerOnly: false,
           channelRestriction: 'guild',
      		 category: 'Generale',
           typing: false,
      		 clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
      		 quoted: false,
           args: [{
    				 id: 'cmd',
             type: 'commandAlias',
    				 prompt: {
               optional: true,
               start: '***questo comando ha bisogno di un argomento (***\`<comando>\`***) per funzionare.***',
               retry: '***devi inserire un argomento (***\`<comando>\`***) valido !***',
               ended: '***tentativi massimi raggiunti per utilizzare questo argomento. Comando cancellato.***',
               timeout: '***tempo scaduto per inserire un argomento (***\`<comando>\`***) valido.***'
    				 }
    			 }],
           description: {
             content: '*Mostra descrizioni avanzate per i comandi di* ***AlweNoBot***',
             usage: config.prefix + 'help <gruppo|comando>',
             examples: [config.prefix + 'help Misc', config.prefix + 'h ping']
           }
         });
     }

	exec(message, args) {
    let categories = ['INFO', 'MISC', 'MOD'];
		if (!args.cmd) return this.execCommandList(message);
    else {
      let description = Object.assign({
  			content: 'Descrizione non disponibile.',
  			usage: '',
  			examples: [],
  			fields: []
  		}, args.cmd.description);
  		let embed = this.client.util.embed().setColor(0x00AE86)
        .setFooter(`Comando del gruppo ${args.cmd.category}. Per visualizzare un altro gruppo fai ${config.prefix}help [gruppo]`)
        .setAuthor(`Comando ${args.cmd.aliases[0].charAt(0).toUpperCase() + args.cmd.aliases[0].slice(1)}`, this.client.user.avatarURL)
  			.setTitle(`\`${description.usage}\``)
  			.addField('Descrizione', description.content);
      if (args.cmd.aliases.length > 1) embed.addField('Alias', `\`${args.cmd.aliases.join('`**,** `')}\``, true);
  		else embed.addField('Alias', `\`${args.cmd.aliases[0]}\``, true);
  		if (description.examples.length) embed.addField('Esempi', `\`${description.examples.join(`\n`)}\``, true);
  		return message.util.send({ embed });
    }
	}

	async execCommandList(message) {
    let infocmds = ['info', 'invite', 'ping', 'server', 'stats'],
        misccmds = ['crypto', 'srk', 'srkgame', 'srktour', 'steam', 'steamgame', 'weather', 
                    'ytinfo', 'overwatch', 'distance', 'poll', 'color', 'cod'],
        modecmds = ['clear', 'prefix', 'reload'];
    let numcmds = infocmds.length + misccmds.length + modecmds.length;
		let embed = this.client.util.embed().setColor(0x00AE86)
      .setAuthor(`Comandi totali : ${numcmds}`, this.client.user.avatarURL)
      .setDescription(`**[ ]** indica **obbligatorio**\n**< >** indica *opzionale*`)
      .addField("Help",
        "**Descrizione :** *Mostra descrizioni avanzate per i comandi di* **AlweNoBot**\n" +
        `\`${config.prefix}help\` **|** \`${config.prefix}help\` \`<comando>\``)
      .addField("INFO", `\`${infocmds.join('`**,** `')}\``, true)
      .addField("MISC", `\`${misccmds.join('`**,** `')}\``, true)
      .addField("MOD", `\`${modecmds.join('`**,** `')}\``, true)
      .setFooter("Lista generale per i comandi di AlweNoBot by zAlweNy26#1059");
      message.channel.send({ embed });
		/*try {
			await message.author.send({ embed });
			return message.util.reply('**controlla i tuoi messaggi privati !**');
		} catch (err) { return message.util.reply('**non è stato possibile inviarti un messaggio privato.**'); }*/
	}
}

module.exports = Help;
