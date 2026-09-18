import { activityCommand } from "./activity"
import { clearCommand } from "./clear"
import { colorCommand } from "./color"
import { counterCommand, farewellCommand, welcomeCommand } from "./config"
import { cryptoCommand } from "./crypto"
import { distanceCommand } from "./distance"
import { helpCommand } from "./help"
import { infoCommand } from "./info"
import { languageCommand } from "./language"
import { mentionCommand } from "./mention"
import { pingCommand } from "./ping"
import { reactionroleCommand } from "./reactionrole"
import { commandMap, commands, registerCommand } from "./registry"
import { serverCommand } from "./server"
import { statsCommand } from "./stats"
import { steamCommand } from "./steam"
import { steamgameCommand } from "./steamgame"
import { summaryCommand } from "./summary"
import { weatherCommand } from "./weather"
import { ytinfoCommand } from "./ytinfo"

registerCommand(helpCommand)
registerCommand(pingCommand)
registerCommand(clearCommand)
registerCommand(colorCommand)
registerCommand(infoCommand)
registerCommand(serverCommand)
registerCommand(statsCommand)
registerCommand(activityCommand)
registerCommand(weatherCommand)
registerCommand(cryptoCommand)
registerCommand(distanceCommand)
registerCommand(ytinfoCommand)
registerCommand(welcomeCommand)
registerCommand(farewellCommand)
registerCommand(counterCommand)
registerCommand(mentionCommand)
registerCommand(steamCommand)
registerCommand(steamgameCommand)
registerCommand(reactionroleCommand)
registerCommand(summaryCommand)
registerCommand(languageCommand)

export { commandMap, commands }
