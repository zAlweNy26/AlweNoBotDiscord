const fs = require('fs')
const Enmap = require('enmap')
const Discord = require('discord.js')
const { prefix, version } = require('./config.json')
const client = new Discord.Client()
client.commands = new Discord.Collection()
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'))

client.settings = new Enmap({
    name: "settings",
    fetchAll: false,
    autoFetch: true,
    cloneLevel: 'deep'
})

const defaultSettings = {
    prefix: ".",
    welcomeID: "benvenuto",
    welcomeMessage: "Benvenuto nel server **{{user}}** !",
    farewellID: "addio",
    farewellMessage: "Addio **{{user}}** !"
}

for (const file of commandFiles) {
	const command = require(`./commands/${file}`)
	client.commands.set(command.name, command)
}

let discordMembers = 0

client.once('ready', () => {
    discordMembers = client.users.cache.size
    /*console.log('AlweNoBot pronto !')
    client.channels.cache.get("735059907350364180").messages.fetch("735062153727311939")
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
    discordMembers = discordMembers + 1

    //client.channels.cache.get("730469363446186025").setName(`👥 MEMBRI : ${discordMembers}`)

    client.settings.ensure(member.guild.id, defaultSettings)
    let welcomeMessage = client.settings.get(member.guild.id, "welcomeMessage")
    welcomeMessage = welcomeMessage.replace("{{user}}", member.user.tag)
    member.guild.channels.cache
        .find(channel => channel.id === client.settings.get(member.guild.id, "welcomeID"))
        .send(welcomeMessage)
        .catch(console.error)
})

client.on('guildMemberRemove', member => {
    discordMembers = discordMembers - 1

    let farewellMessage = client.settings.get(member.guild.id, "farewellMessage")
    farewellMessage = farewellMessage.replace("{{user}}", member.user.tag)
    member.guild.channels.cache
        .find(channel => channel.id === client.settings.get(member.guild.id, "farewellID"))
        .send(farewellMessage)
        .catch(console.error)
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

	if (command.args && !args.length) {
        let reply = `**Non hai fornito nessun argomento, ${message.author} !**`
    
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

client.login(/*process.env.token*/'Mzg5NDU1Mjk0MDI1MDM5ODcy.Wi1igQ.XxyUe28ZJ1bTFT5Vk7DkpfOFI0w')