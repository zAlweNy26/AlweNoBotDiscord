const config = require("./../../config.json");
const mine = require('./../../functions.js');
const { Command } = require('discord-akairo');
const Discord = require("discord.js");

class Clear extends Command {
    constructor() {
        super('clear', {
           aliases: ['clear'],
           ownerOnly: false,
           channelRestriction: 'guild',
           category: 'Mod',
           typing: false,
           userPermissions: ['SEND_MESSAGES', 'EMBED_LINKS', 'MANAGE_MESSAGES'],
           clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS', 'MANAGE_MESSAGES'],
           args: [{
    				 id: 'num',
             type: 'number',
    				 prompt: {
               start: '***questo comando ha bisogno di un numero (***\`[numero]\`***) per funzionare.***',
               retry: '***devi inserire un numero (***\`[numero]\`***) valido !***',
               ended: '***tentativi massimi raggiunti per utilizzare questo comando. Comando cancellato.***',
               timeout: '***tempo scaduto per inserire un numero (***\`[numero]\`***) valido.***'
    				 }
    			 }],
           description: {
             content: '*Mostra informazioni su un utente/bot del server o su te stesso*',
             usage: config.prefix + 'clear [numero]',
             examples: [config.prefix + 'clear 5', config.prefix + 'clear 26']
           }
        });
    }

    exec(message, args) {
      if (args.num <= 50) {
        message.channel.fetchMessages().then(messages => {
            message.channel.bulkDelete(args.num);
            let msgs = this.client.util.embed().setColor(0x00AE86)
              .setDescription("*Messaggi eliminati in totale :* **" + args.num + "** ✅");
            message.channel.send({embed: msgs});
            setTimeout(function() { message.channel.bulkDelete(1); }, 2000);
        }).catch(error => { console.log(error); });
      } else {
        message.channel.fetchMessages().then(messages => {
            message.channel.bulkDelete(50);
            let msgs = this.client.util.embed().setColor(0x00AE86)
              .setDescription("*Messaggi eliminati in totale :* **50** ✅");
            message.channel.send({embed: msgs});
            setTimeout(function() { message.channel.bulkDelete(1); }, 2000);
        }).catch(error => { console.log(error); });
      }
    }
}

module.exports = Clear;
