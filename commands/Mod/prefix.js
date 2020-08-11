const config = require("../../config.json");
const mine = require('../../functions.js');
const { Command } = require('discord-akairo');
const Discord = require("discord.js");
const fs = require('fs');

class Prefix extends Command {
    constructor() {
        super('prefix', {
           aliases: ['prefix', 'p'],
           ownerOnly: false,
           channelRestriction: 'guild',
           category: 'Mod',
           typing: false,
           userPermissions: ['SEND_MESSAGES', 'EMBED_LINKS', 'ADMINISTRATOR'],
           clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
           args: [{
    				 id: 'prefix',
    				 prompt: {
    					 start: `***questo comando ha bisogno di un argomento (***\`[prefix]\`***) per funzionare.***`,
               retry: '***devi inserire dei caratteri (***\`[prefix]\`***) validi !***',
               ended: '***tentativi massimi raggiunti per utilizzare questo comando. Comando cancellato.***',
               timeout: '***tempo scaduto per inserire dei caratteri (***\`[prefix]\`***) validi.***'
    				 }
    			 }],
           description: {
             content: '*Cambia il prefisso per i comandi in* **[carattere]**',
             usage: config.prefix + 'prefix [prefix]',
             examples: [config.prefix + 'prefix z!', config.prefix + 'prefix a-']
           }
        });
    }

    /*async*/ exec(message, args) {
      let bot = this.client;
      let err = bot.util.embed().setColor(0xC80000)
        .setDescription(`***COMANDO MOMENTANEAMENTE NON DISPONIBILE***`);
      message.channel.send({ embed: err });
      /*let pref = this.client.util.embed().setColor(0x00AE86)
        .setDescription(`*Il nuovo prefisso per i comandi di* ***AlweNoBot*** *è stato impostato da \`${config.prefix}\` a \`${args.prefix}\`* *!*`);
      message.channel.send({embed: pref});*/
      /*config.prefix = args.prefix;
      fs.writeFile("./config.json", JSON.stringify(config, null, 2), (err) => console.error);
      await this.client.settings.set(message.guild, 'prefix', args.prefix);
      this.client.user.setActivity(config.prefix + "help | " + config.version);*/
    }
}

module.exports = Prefix;
