const Discord = require("discord.js");

module.exports = {
  	name: 'poll',
  	description: '*Crea un sondaggio*',
  	aliases: ['pl'],
  	category: 'Misc',
  	usage: '[titolo] [opzione1,opzione2,...]',
  	userPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
    guildOnly: true,
    ownerOnly: false,
    examples: ['poll Prova|si,no,forse', 'pl Titolo|1,2,3'],
    args: -1,
    execute(message, args) {
        let question = message.content.substring(message.content.indexOf(" ") + 1, message.content.indexOf("|"));
        let answers = message.content.substring(message.content.indexOf("|") + 1, message.content.length).split(",");
        let numEmojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
        for (let i = 0; i < answers.length; i++) answers[i] = numEmojis[i] + " " + answers[i]
        //const filterReact = (reaction) => numEmojis.includes(reaction.emoji.name);
        let poll = new Discord.MessageEmbed().setColor(0xFFFF00)
            .setTitle("📝" + question.charAt(0).toUpperCase() + question.slice(1).toLowerCase())
            .setDescription(answers.join("\n"));
        //message.awaitReactions(filterReact, { max: 1, time: 30000 });
        message.channel.send(poll).then(msg => {
            for (let i = 0; i < answers.length; i++) msg.react(numEmojis[i]);
        });
    },
}
