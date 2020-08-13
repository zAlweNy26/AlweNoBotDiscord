const fs = require('fs')
const Enmap = require('enmap')
const Discord = require('discord.js')
const EnmapPGSql = require('enmap-pgsql')
const { prefix, version } = require('./config.json')
const client = new Discord.Client()
client.commands = new Discord.Collection()
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'))

client.settings = new Enmap({
    name: "settings",
    fetchAll: false,
    autoFetch: true,
    cloneLevel: 'deep',
    provider: new EnmapPGSql({ 
        name: "settings",
        connectionString: process.env.DATABASE_URL
    })
})

const defaultSettings = {
    prefix: ".",
    welcome: true,
    welcomeID: "742811567988539554",
    welcomeMessage: "Benvenuto **{{utente}}** su **RDA - Skin & Scripts** ! :tada: Ottieni il ruolo <@742833112245076029> nel canale <#743412863032623204> !",
    farewell: true,
    farewellID: "742833934790033489",
    farewellMessage: "Ci dispiace che te ne sia andato {{utente}}. Fai buon viaggio ! :rolling_eyes:",
    membersInChannel: true,
    membersInChannelID: "742874009942753382",
    membersInChannelName: "👥 Membri : {{membri}}",
}

for (const file of commandFiles) {
	const command = require(`./commands/${file}`)
	client.commands.set(command.name, command)
}

client.once('ready', () => {
    /*client.channels.cache.get("735059907350364180").messages.fetch("735062153727311939")
    client.channels.cache.get("730469363446186025").setName(`👥 MEMBRI : ${discordMembers}`)
    setInterval(() => {
	    srv.getPlayers().then(data => client.channels.cache.get("741088940173295667").setName(`👥 SERVER : ${data}`))
    }, 10000)*/

    console.log(`Bot online ! Insieme a ${client.users.cache.size} utenti, in ${client.guilds.cache.size} server !`)
    client.user.setPresence({ activity: { name: `${prefix}help | v${version}`, type: 'PLAYING' }, status: 'online' })
        .catch(console.error)
})

client.on("guildDelete", guild => {
    client.settings.delete(guild.id)
})

client.on("guildMemberAdd", member => {
    client.settings.ensure(member.guild.id, defaultSettings)

    if (client.settings.get(member.guild.id, "welcome") == true) {
        let welcomeMessage = client.settings.get(member.guild.id, "welcomeMessage")
        welcomeMessage = welcomeMessage.replace("{{utente}}", member.user.tag)
        member.guild.channels.cache
            .find(channel => channel.id === client.settings.get(member.guild.id, "welcomeID"))
            .send(welcomeMessage)
            .catch(console.error)
    }

    if (client.settings.get(member.guild.id, "membersInChannel") == true) {
        let membersInChannel = client.settings.get(member.guild.id, "membersInChannelName")
        membersInChannel = membersInChannel.replace("{{membri}}", member.guild.members.cache.size)
        member.guild.channels.cache
            .find(channel => channel.id === client.settings.get(member.guild.id, "membersInChannelID"))
            .setName(membersInChannel)
            .catch(console.error)
    }
})

client.on('guildMemberRemove', member => {

    if (client.settings.get(member.guild.id, "farewell") == true) {
        let farewellMessage = client.settings.get(member.guild.id, "farewellMessage")
        farewellMessage = farewellMessage.replace("{{utente}}", member.user.tag)
        member.guild.channels.cache
            .find(channel => channel.id === client.settings.get(member.guild.id, "farewellID"))
            .send(farewellMessage)
            .catch(console.error)
    }

    if (client.settings.get(member.guild.id, "membersInChannel") == true) {
        let membersInChannel = client.settings.get(member.guild.id, "membersInChannelName")
        membersInChannel = membersInChannel.replace("{{membri}}", member.guild.members.cache.size)
        member.guild.channels.cache
            .find(channel => channel.id === client.settings.get(member.guild.id, "membersInChannelID"))
            .setName(membersInChannel)
            .catch(console.error)
    }
})

client.on('message', message => {
    if(!message.guild || message.author.bot) return;

    const guildConf = client.settings.ensure(message.guild.id, defaultSettings)

    if (!message.content.startsWith(guildConf.prefix)) return

	const args = message.content.slice(guildConf.prefix.length).trim().split(/ +/)
	const commandName = args.shift().toLowerCase()
	const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName))

    if (!command) return
    
	if (command.guildOnly && message.channel.type === 'dm') {
		return message.reply('**Non posso eseguire questo comando nei DM !**')
    }
  
    if (!message.member.hasPermission(command.userPermissions)) {
        return message.channel.send("**Non hai i permessi per usare questo comando !**")
    }

	if ((command.args > 0 || command.args == -1) && !args.length) {
        let reply

        if (args.length == 0) reply = `**Non hai fornito nessun argomento, ${message.author} !**`
        else if (command.args != args.length) reply = `**Non hai fornito tutti gli argomenti necessari, ${message.author} !**`
    
		if (command.usage) {
			reply += `\n**Come usarlo :** \`${guildConf.prefix}${command.name} ${command.usage}\``
        }
    
		return message.channel.send(reply)
	}

	try {
        message.channel.bulkDelete(1)
		command.execute(message, args)
	} catch (error) {
		console.error(error)
		message.reply("**C'è stato un errore durante l'esecuzione del comando !**")
	}
})

client.on("disconnected", () => console.log("\nBot disconnesso !"))
    .on('reconnect', () => console.log('\nIl client sta provando a riconnettersi...'))
    .on('error', err => console.log(err))
    .on('warn', info => console.log(info))

client.login(process.env.token)