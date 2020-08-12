const config = require("./../../config.json");
const mine = require('./../../functions.js');
const { Command } = require('discord-akairo');
const Discord = require("discord.js");
const codAPI = require("cod-api");

class CODStats extends Command {
  constructor() {
    super('cod', {
      aliases: ['cod'],
      ownerOnly: false,
      channelRestriction: 'guild',
      category: 'Misc',
      typing: false,
      userPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
      clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
      args: [
        {
          id: 'game',
          type: 'lowercase',
          prompt: {
            start: '***questo comando ha bisogno che l argomento sia uguale a \`BO3\`, \`WW1\` o \`WW2\` per funzionare.***',
            retry: '***devi inserire un argomento \`BO3\`, \`WW1\` o \`WW2\` !***',
            ended: '***tentativi massimi raggiunti per utilizzare questo comando. Comando cancellato.***',
            timeout: '***tempo scaduto per inserire un argomento valido.***'
          }
        },
        {
          id: 'pf',
          type: 'lowercase',
          prompt: {
            start: '***questo comando ha bisogno che l argomento sia uguale a \`XB1\`, \`PS4\` o \`PC\` per funzionare.***',
            retry: '***devi inserire un argomento \`XB1\`, \`PS4\` o \`PC\` !***',
            ended: '***tentativi massimi raggiunti per utilizzare questo comando. Comando cancellato.***',
            timeout: '***tempo scaduto per inserire un argomento valido.***'
          }
        },
        {
          id: 'name',
          type: 'string',
          prompt: {
            start: '***questo comando ha bisogno di un argomento (***\`[nickname]\`***) per funzionare.***',
            retry: '***devi inserire un argomento (***\`[nickname]\`***) valido !***',
            ended: '***tentativi massimi raggiunti per utilizzare questo comando. Comando cancellato.***',
            timeout: '***tempo scaduto per inserire un argomento (***\`[nickname]\`***) valido.***'
          }
        }
      ],
      description: {
        content: '*Mostra informazioni sull account di Call Of Duty di* **[nickname]**',
        usage: config.prefix + 'cod [gioco] [piattaforma] [nickname]',
        examples: [config.prefix + 'cod bo3 ps4 Mortality', config.prefix + 'cod ww2 pc ExampleMan']
      }
    });
  }

  exec(message, args) {
    let bot = this.client;
    let err = bot.util.embed().setColor(0xC80000)
      .setDescription(`***COMANDO MOMENTANEAMENTE NON DISPONIBILE***`);
    message.channel.send({ embed: err });
    /*let bot = this.client, pfs = ["XB1", "PS4", "PC"], games = ["BO3", "WW2", "WW1"];
    if (games.includes(args.game.toUpperCase()) == false) {
      let abbr = "";
      for (let i = 0; i < games.length; i++) {
        if (i === 0) abbr = games[i] + abbr;
        else abbr = games[i] + ", " + abbr;
      }
      let err = bot.util.embed().setColor(0xC80000)
        .setDescription(`***Le abbreviazioni disponibili per i giochi sono :*** \`` + abbr + `\``);
      message.channel.send({ embed: err });
    } else if (pfs.includes(args.pf.toUpperCase()) == false) {
      let abbr = "";
      for (let i = 0; i < pfs.length; i++) {
        if (i === 0) abbr = pfs[i] + abbr;
        else abbr = pfs[i] + ", " + abbr;
      }
      let err = bot.util.embed().setColor(0xC80000)
        .setDescription(`***Le abbreviazioni disponibili per le piattaforme sono :*** \`` + abbr + `\``);
      message.channel.send({ embed: err });
    } else {
      let platform = args.pf, name = args.name, game = args.game;
      if (game.toUpperCase() == "WW2") game = "wwii";
      else if (game.toUpperCase() == "WW1") game = "iw";
      if (platform.toUpperCase() == "XB1") platform = "xbl";
      else if (platform.toUpperCase() == "PS4") platform = "psn";
      else if (platform.toUpperCase() == "PC") platform = "steam";
      codAPI.getProfile({ game, platform, name }).then(response => {
          let owinfo = bot.util.embed().setColor(0x00AE86).setTimestamp().setFooter("© AlweNoBot by zAlweNy26#1059", bot.user.avatarURL);
          console.log(response);
          message.channel.send({ embed: owinfo });
        }).catch(err => {
          let error = bot.util.embed().setColor(0xC80000)
            .setDescription(`***L'utente inserito non è presente nei database di Call Of Duty !***`);
          message.channel.send({ embed: error });
      });
    }*/
  }
}

module.exports = CODStats;