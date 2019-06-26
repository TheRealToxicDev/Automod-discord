function hasModrole(message, memDB) {
    if (message.member.roles.has(memDB[message.guild.id].settings.modRole)) return true
    return false
}

module.exports = {
    name: "enable",
    execute(memDB, Database, Discord, message, args) {
        if (hasModrole(message, memDB) || message.author.id == message.guild.ownerID) {
            if (memDB[message.guild.id][message.channel.id]) {
                if (memDB[message.guild.id][message.channel.id].am_enabled) {
                    message.channel.send("Automod is already enabled.").catch(console.error)
                } else {
                    memDB[message.guild.id][message.channel.id].am_enabled = true

                    const db = new Database("am.db", { fileMustExist: true })

                    db.prepare("UPDATE data SET am_enabled = ? WHERE serverID = ? AND channelID = ?").run(1, message.guild.id, message.channel.id)

                    db.close()

                    message.channel.send("Automod has been enabled.").catch(console.error)
                }
            } else {
                memDB[message.guild.id][message.channel.id] = {am_enabled: true}

                const db = new Database("am.db", { fileMustExist: true })

                db.prepare("INSERT INTO data (serverID, channelID, am_enabled) VALUES (?, ?, ?)").run(message.guild.id, message.channel.id, 1)

                db.close()

                message.channel.send("Automod has been enabled.").catch(console.error)
            }
        } else {
            message.channel.send("<@" + message.author.id + "> You don't have permission to use this command.").catch(console.error)
        }
    }
}