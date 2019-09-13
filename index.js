const config = require("./config.json")
const classifier = require("./model.js")
const fs = require("fs")
const Database = require("better-sqlite3")
const Discord = require("discord.js")
const client = new Discord.Client()
client.commands = new Discord.Collection()

const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith(".js"))

for (const file of commandFiles) {
    const command = require("./commands/" + file)
    client.commands.set(command.name, command)
}

const db = new Database("am.db", { fileMustExist: true })

const stmt = db.prepare("SELECT serverID, threshold, modRole, modRoleExempt, loggingChannel, muteRole, muteDuration, deleted, temp_mute, kick, softban, ban, identity_attack, insult, obscene, severe_toxicity, sexual_explicit, threat, toxicity FROM server_settings").all()
const stmt2 = db.prepare("SELECT serverID, channelID, am_enabled FROM data").all()
const stmt3 = db.prepare("SELECT serverID, userID, total_infractions, deleted, temp_mute, kick, softban, ban FROM user_data").all()
const stmt4 = db.prepare("SELECT serverID, userID, deleted, temp_mute, kick, softban, ban FROM user_data_internal").all()

db.close()

// I'm using memDB so i don't have to access the db every time i have to check something
// Arguably not the best solution but it works for now
const memDB = {}

for (const row of stmt) {
    if (!Object.prototype.hasOwnProperty.call(memDB, row.serverID)) {
        memDB[row.serverID] = {}
        memDB[row.serverID].user_data = {}
        memDB[row.serverID].user_data_internal = {}
    }

    /*
    Threshold is the minimum prediction confidence, a confidence under the specifed score will be ignored, default is 0.85
    modRole is the id of the mod role that was set, default is null
    loggingChannel is the id of the channel that the bot sends the logs to, default is null
    muteRole is the id of the role that gets used to mute people, default is null
    muteDuration is the time to mute someone in milliseconds
    deleted, temp_mute, kick, softban and ban are values that specify after how many total infractions an action should be executed, default is 0 for deleted and -1 for everything else, a value of 0 means instanly, a value of -1 means never
    Everything after that is the setting for a tag, if its true that means only messages that get classified with this tag get deleted, default is false
    */
    memDB[row.serverID].settings = {threshold: row.threshold, modRole: row.modRole, modRoleExempt: row.modRoleExempt, loggingChannel: row.loggingChannel, muteRole: row.muteRole, muteDuration: row.muteDuration, deleted: row.deleted, temp_mute: row.temp_mute, kick: row.kick, softban: row.softban, ban: row.ban, identity_attack: row.identity_attack, insult: row.insult, obscene: row.obscene, severe_toxicity: row.severe_toxicity, sexual_explicit: row.sexual_explicit, threat: row.threat, toxicity: row.toxicity}
}

for (const row of stmt2) {
    if (!Object.prototype.hasOwnProperty.call(memDB, row.serverID)) {
        memDB[row.serverID] = {}
        memDB[row.serverID].user_data = {}
        memDB[row.serverID].user_data_internal = {}
    }

    // am_enabled is the setting that turns Automod on/off
    if (!Object.prototype.hasOwnProperty.call(memDB[row.serverID], row.channelID)) {
        memDB[row.serverID][row.channelID] = {am_enabled: row.am_enabled}
    }
}

for (const row of stmt3) {
    // These count the amount of times a user recieved this specific punishment
    if (!Object.prototype.hasOwnProperty.call(memDB[row.serverID].user_data, row.userID)) {
        memDB[row.serverID].user_data[row.userID] = {total_infractions: row.total_infractions, deleted: row.deleted, temp_mute: row.temp_mute, kick: row.kick, softban: row.softban, ban: row.ban}
    }
}

for (const row of stmt4) {
    // user_data_internal is used as a counter to check when to punish someone
    if (memDB[row.serverID] && !Object.prototype.hasOwnProperty.call(memDB[row.serverID].user_data_internal, row.userID)) {
        memDB[row.serverID].user_data_internal[row.userID] = {deleted: row.deleted, temp_mute: row.temp_mute, kick: row.kick, softban: row.softban, ban: row.ban}
    }
}

console.log("Logging in")
client.login(config.token)

client.on("ready", () => {
    console.log("Logged in")

    // This makes sure that we create objects for servers which were joined while the bot was off
    client.guilds.forEach(guild => {
        if (!Object.prototype.hasOwnProperty.call(memDB, guild.id)) {
            memDB[guild.id] = {}
            memDB[guild.id].user_data = {}
            memDB[guild.id].user_data_internal = {}
            memDB[guild.id].settings = {threshold: 0.85, modRole: null, modRoleExempt: false, loggingChannel: null, muteRole: null, muteDuration: 0, deleted: 0, temp_mute: null, kick: null, softban: null, ban: null, identity_attack: false, insult: false, obscene: false, severe_toxicity: false, sexual_explicit: false, threat: false, toxicity: false}

            const db = new Database("am.db", { fileMustExist: true })

            db.prepare("INSERT INTO server_settings (serverID) VALUES (?)").run(guild.id)

            db.close()
        }
    })

    const db = new Database("am.db", { fileMustExist: true })

    const stmt = db.prepare("SELECT serverID, userID, muted_at, duration, mute_role FROM muted_users").all()

    db.close()

    // In case the bot muted a user and went offline this either unmutes the user if the mute duration is over or sets a new timeout
    // that way we can make sure we don't accidentally mute a user indefinitely
    if (stmt.length) {
        for (const row of stmt) {
            if (new Date().getTime() - row.muted_at >= row.duration) {
                if (client.guilds.get(row.serverID) && client.guilds.get(row.serverID).members.get(row.userID)) {
                    const guild = client.guilds.get(row.serverID)
                    const member = guild.members.get(row.userID)

                    member.removeRole(row.mute_role)
                    .catch(console.error)

                    const db = new Database("am.db", { fileMustExist: true })

                    db.prepare("DELETE FROM muted_users WHERE serverID = ? AND userID = ?").run(row.serverID, row.userID)

                    db.close()
                } else {
                    const message = {guild: {id: row.serverID}, author: {id: row.userID}, member: client.guilds.get(row.serverID).members.get(row.userID)}
                    setTimeout(removeMute, row.duration - (new Date().getTime() - row.muted_at), message, row.mute_role).unref()
                }
            } else {
                const message = {guild: {id: row.serverID}, author: {id: row.userID}, member: client.guilds.get(row.serverID).members.get(row.userID)}
                setTimeout(removeMute, row.duration - (new Date().getTime() - row.muted_at), message, row.mute_role).unref()
            }
        }
    }
})

client.on("roleDelete", role => {
    // This sets mod roles or mute roles back to null if they get deleted to make sure we don't have old data in the db
    if (memDB[role.guild.id].settings.modRole == role.id) {
        memDB[role.guild.id].settings.modRole = null

        const db = new Database("am.db", { fileMustExist: true })

        db.prepare("UPDATE server_settings SET modRole = ? WHERE serverID = ?").run(null, role.guild.id)

        db.close()
    }

    if (memDB[role.guild.id].settings.muteRole == role.id) {
        memDB[role.guild.id].settings.muteRole = null

        const db = new Database("am.db", { fileMustExist: true })

        db.prepare("UPDATE server_settings SET muteRole = ? WHERE serverID = ?").run(null, role.guild.id)

        db.close()
    }
})

client.on("guildCreate", guild => {
    memDB[guild.id] = {settings: {threshold: 0.85, modRole: null, modRoleExempt: false, loggingChannel: null, muteRole: null, muteDuration: 0, deleted: 0, temp_mute: null, kick: null, softban: null, ban: null, identity_attack: false, insult: false, obscene: false, severe_toxicity: false, sexual_explicit: false, threat: false, toxicity: false}}

    const db = new Database("am.db", { fileMustExist: true })

    db.prepare("INSERT INTO server_settings (serverID) VALUES (?)").run(guild.id)

    db.close()
})

client.on("guildDelete", guild => {
    delete memDB[guild.id]

    const db = new Database("am.db", { fileMustExist: true })

    db.prepare("DELETE FROM data WHERE serverID = ?").run(guild.id)
    db.prepare("DELETE FROM server_settings WHERE serverID = ?").run(guild.id)

    db.close()
})

client.on("channelDelete", channel => {
    for (const server in memDB) {
        if (Object.prototype.hasOwnProperty.call(memDB[server], channel.id)) {
            delete memDB[server][channel.id]

            const db = new Database("am.db", { fileMustExist: true })

            db.prepare("DELETE FROM data WHERE serverID = ? AND channelID = ?").run(server, channel.id)

            db.close()
        }

        if (memDB[server].settings.loggingChannel == channel.id) {
            memDB[server].settings.loggingChannel = null

            const db = new Database("am.db", { fileMustExist: true })

            db.prepare("UPDATE server_settings SET loggingChannel = ? WHERE serverID = ?").run(null, server)

            db.close()

            break
        }
    }
})

client.on("message", async message => {
    if (message.author.bot || message.channel.type != "text") return

    if (message.content.startsWith(config.prefix)) {
        const args = message.content.slice(config.prefix.length).trim().toLowerCase().split(/ +/)
        const commandName = args.shift()

        try {
            const command = client.commands.get(commandName)
            command.execute(memDB, Database, Discord, message, args)
        } catch(e) {
            console.error(e)
        }
    }

    if (!memDB[message.guild.id][message.channel.id] || !memDB[message.guild.id][message.channel.id].am_enabled) return

    if (memDB[message.guild.id].settings.modRoleExempt && message.member.roles.has(memDB[message.guild.id].settings.modRole)) return

    const result = await Promise.all(await classifier(message, memDB)).catch(console.error)
    if (tagDelete(message, result)) {
        punishment(message)
    } else {
        if (result[6].match) {
            punishment(message)
        }
    }
})

function tagDelete(message, result) {
    if (memDB[message.guild.id].settings.identity_attack && result[0].match) return true
    if (memDB[message.guild.id].settings.insult && result[1].match) return true
    if (memDB[message.guild.id].settings.obscene && result[2].match) return true
    if (memDB[message.guild.id].settings.severe_toxicity && result[3].match) return true
    if (memDB[message.guild.id].settings.sexual_explicit && result[4].match) return true
    if (memDB[message.guild.id].settings.threat && result[5].match) return true
    if (memDB[message.guild.id].settings.toxicity && result[6].match) return true
    return false
}

function punishment(message) {
    if (!memDB[message.guild.id].user_data[message.author.id]) {
        memDB[message.guild.id].user_data[message.author.id] = {total_infractions: 1, deleted: 0, temp_mute: 0, kick: 0, softban: 0, ban: 0}
        memDB[message.guild.id].user_data_internal[message.author.id] = {deleted: 0, temp_mute: 0, kick: 0, softban: 0, ban: 0}

        const db = new Database("am.db", { fileMustExist: true })

        db.prepare("INSERT INTO user_data (serverID, userID, total_infractions) VALUES (?, ?, ?)").run(message.guild.id, message.author.id, memDB[message.guild.id].user_data[message.author.id].total_infractions)
        db.prepare("INSERT INTO user_data_internal (serverID, userID) VALUES (?, ?)").run(message.guild.id, message.author.id)

        db.close()
    } else {
        memDB[message.guild.id].user_data[message.author.id].total_infractions++
        memDB[message.guild.id].user_data_internal[message.author.id].deleted++
        memDB[message.guild.id].user_data_internal[message.author.id].temp_mute++
        memDB[message.guild.id].user_data_internal[message.author.id].kick++
        memDB[message.guild.id].user_data_internal[message.author.id].softban++
        memDB[message.guild.id].user_data_internal[message.author.id].ban++
    }

    if (memDB[message.guild.id].settings.deleted != null && memDB[message.guild.id].user_data_internal[message.author.id].deleted >= memDB[message.guild.id].settings.deleted) {
        message.delete()
        .catch(console.error)
        
        memDB[message.guild.id].user_data[message.author.id].deleted++
        memDB[message.guild.id].user_data_internal[message.author.id].deleted = 0

        const db = new Database("am.db", { fileMustExist: true })

        db.prepare("UPDATE user_data SET deleted = ? WHERE serverID = ? AND userID = ?").run(memDB[message.guild.id].user_data[message.author.id].deleted, message.guild.id, message.author.id)
        db.prepare("UPDATE user_data_internal SET deleted = ? WHERE serverID = ? AND userID = ?").run(memDB[message.guild.id].user_data_internal[message.author.id].deleted, message.guild.id, message.author.id)

        db.close()

        if (memDB[message.guild.id].settings.loggingChannel) {
            client.channels.get(memDB[message.guild.id].settings.loggingChannel).send(new Discord.RichEmbed()
            .setColor("#0099ff")
            .setDescription("Deleted a message from <@" + message.author.id + "> in <#" + message.channel.id +">\n" + new Date().toUTCString())
            )
        }
    }

    if (memDB[message.guild.id].settings.temp_mute != null && memDB[message.guild.id].user_data_internal[message.author.id].temp_mute >= memDB[message.guild.id].settings.temp_mute) {
        if (!message.member.roles.has(memDB[message.guild.id].settings.muteRole)) {
            message.member.addRole(memDB[message.guild.id].settings.muteRole)
            .catch(console.error)

            setTimeout(removeMute, memDB[message.guild.id].settings.muteDuration, message, memDB[message.guild.id].settings.muteRole).unref()

            memDB[message.guild.id].user_data[message.author.id].temp_mute++
            memDB[message.guild.id].user_data_internal[message.author.id].temp_mute = 0

            const db = new Database("am.db", { fileMustExist: true })

            db.prepare("INSERT INTO muted_users (serverID, userID, muted_at, duration, mute_role) VALUES (?, ?, ?, ?, ?)").run(message.guild.id, message.author.id, new Date().getTime(), memDB[message.guild.id].settings.muteDuration, memDB[message.guild.id].settings.muteRole)
            db.prepare("UPDATE user_data SET temp_mute = ? WHERE serverID = ? AND userID = ?").run(memDB[message.guild.id].user_data[message.author.id].temp_mute, message.guild.id, message.author.id)
            db.prepare("UPDATE user_data_internal SET temp_mute = ? WHERE serverID = ? AND userID = ?").run(memDB[message.guild.id].user_data_internal[message.author.id].temp_mute, message.guild.id, message.author.id)

            db.close()

            if (memDB[message.guild.id].settings.loggingChannel) {
                client.channels.get(memDB[message.guild.id].settings.loggingChannel).send(new Discord.RichEmbed()
                .setColor("#0099ff")
                .setDescription("Muted <@" + message.author.id + "> for " + memDB[message.guild.id].settings.muteDuration / 1000 + " Seconds\n" + new Date().toUTCString())
                )
            }
        }
    }

    if (memDB[message.guild.id].settings.kick != null && memDB[message.guild.id].user_data_internal[message.author.id].kick >= memDB[message.guild.id].settings.kick) {
        message.member.kick()
        .catch(console.error)

        memDB[message.guild.id].user_data[message.author.id].kick++
        memDB[message.guild.id].user_data_internal[message.author.id].kick = 0

        const db = new Database("am.db", { fileMustExist: true })

        db.prepare("UPDATE user_data SET kick = ? WHERE serverID = ? AND userID = ?").run(memDB[message.guild.id].user_data[message.author.id].kick, message.guild.id, message.author.id)
        db.prepare("UPDATE user_data_internal SET kick = ? WHERE serverID = ? AND userID = ?").run(memDB[message.guild.id].user_data_internal[message.author.id].kick, message.guild.id, message.author.id)

        db.close()

        if (memDB[message.guild.id].settings.loggingChannel) {
            client.channels.get(memDB[message.guild.id].settings.loggingChannel).send(new Discord.RichEmbed()
            .setColor("#0099ff")
            .setDescription("Kicked <@" + message.author.id + ">\n" + new Date().toUTCString())
            )
        }
    }

    if (memDB[message.guild.id].settings.softban != null && memDB[message.guild.id].user_data_internal[message.author.id].softban >= memDB[message.guild.id].settings.softban) {
        message.member.ban(7)
        .then(() => message.guild.unban(message.author.id))
        .catch(console.error)

        memDB[message.guild.id].user_data[message.author.id].softban++
        memDB[message.guild.id].user_data_internal[message.author.id].softban = 0

        const db = new Database("am.db", { fileMustExist: true })

        db.prepare("UPDATE user_data SET softban = ? WHERE serverID = ? AND userID = ?").run(memDB[message.guild.id].user_data[message.author.id].softban, message.guild.id, message.author.id)
        db.prepare("UPDATE user_data_internal SET softban = ? WHERE serverID = ? AND userID = ?").run(memDB[message.guild.id].user_data_internal[message.author.id].softban, message.guild.id, message.author.id)

        db.close()

        if (memDB[message.guild.id].settings.loggingChannel) {
            client.channels.get(memDB[message.guild.id].settings.loggingChannel).send(new Discord.RichEmbed()
            .setColor("#0099ff")
            .setDescription("Softbanned <@" + message.author.id + ">\n" + new Date().toUTCString())
            )
        }
    }

    if (memDB[message.guild.id].settings.ban != null && memDB[message.guild.id].user_data_internal[message.author.id].ban >= memDB[message.guild.id].settings.ban) {
        message.member.ban()
        .catch(console.error)

        memDB[message.guild.id].user_data[message.author.id].ban++
        memDB[message.guild.id].user_data_internal[message.author.id].ban = 0

        const db = new Database("am.db", { fileMustExist: true })

        db.prepare("UPDATE user_data SET ban = ? WHERE serverID = ? AND userID = ?").run(memDB[message.guild.id].user_data[message.author.id].ban, message.guild.id, message.author.id)
        db.prepare("UPDATE user_data_internal SET ban = ? WHERE serverID = ? AND userID = ?").run(memDB[message.guild.id].user_data_internal[message.author.id].ban, message.guild.id, message.author.id)

        db.close()

        if (memDB[message.guild.id].settings.loggingChannel) {
            client.channels.get(memDB[message.guild.id].settings.loggingChannel).send(new Discord.RichEmbed()
            .setColor("#0099ff")
            .setDescription("Banned <@" + message.author.id + ">\n" + new Date().toUTCString())
            )
        }
    }
}

function removeMute(message, muteRole) {
    message.member.removeRole(muteRole)
    .catch(console.error)

    const db = new Database("am.db", { fileMustExist: true })

    db.prepare("DELETE FROM muted_users WHERE serverID = ? AND userID = ?").run(message.guild.id, message.author.id)

    db.close()
}