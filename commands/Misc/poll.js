const config = require("./../../config.json");
const mine = require('./../../functions.js');
const { Command } = require('discord-akairo');
const Discord = require("discord.js");
const request = require("request");

class Poll extends Command {
  constructor() {
    super('poll', {
      aliases: ['poll', 'pl'],
      ownerOnly: false,
      channelRestriction: 'guild',
      category: 'Info',
      typing: false,
      userPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
      clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
      /*args: [
        {
          id: 'title',
          type: 'string',
          prompt: {
            start: '***questo comando ha bisogno di un titolo (***\`[titolo]\`***) per funzionare.***',
            retry: '***devi inserire un titolo (***\`[titolo]\`***) valida !***',
            ended: '***tentativi massimi raggiunti per utilizzare questo comando. Comando cancellato.***',
            timeout: '***tempo scaduto per inserire un titolo (***\`[titolo]\`***) valida.***'
          }
        },
        {
          id: 'options',
          type: 'string',
          prompt: {
            start: '***questo comando ha bisogno di opzioni (***\`[opzione1,opzione2,...]\`***) per funzionare.***',
            retry: '***devi inserire delle opzioni (***\`[opzione1,opzione2,...]\`***) valide !***',
            ended: '***tentativi massimi raggiunti per utilizzare questo comando. Comando cancellato.***',
            timeout: '***tempo scaduto per inserire delle opzioni (***\`[opzione1,opzione2,...]\`***) valide.***'
          }
        }
      ],*/
      description: {
        content: '*Mostra informazioni su un utente/bot del server o su te stesso*',
        usage: config.prefix + 'poll [titolo] [opzione1,opzione2,...]',
        examples: [config.prefix + 'poll Prova si,no,forse', config.prefix + 'pl Titolo 1,2,3']
      }
    });
  }

  async exec(message, args) {
    let bot = this.client;
    let question = message.content.substring(message.content.indexOf(" ") + 1, message.content.indexOf("|"));
    let answers = message.content.substring(message.content.indexOf("|") + 1, message.content.length).replace(/ /g, "").split(",");
    let numEmojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
    for (let i = 0; i < answers.length; i++) answers[i] = numEmojis[i] + " " + answers[i]
    //const filterReact = (reaction) => numEmojis.includes(reaction.emoji.name);
    let poll = bot.util.embed().setColor(0xFFFF00).setTimestamp().setFooter("© AlweNoBot by zAlweNy26#1059")
      .setTitle("📝" + question.charAt(0).toUpperCase() + question.slice(1).toLowerCase())
      .setDescription(answers.join("\n"));
    //message.awaitReactions(filterReact, { max: 1, time: 30000 });
    message.channel.send({embed: poll}).then(msg => {
      for (let i = 0; i < answers.length; i++) msg.react(numEmojis[i]);
    });
  }
}

module.exports = Poll;