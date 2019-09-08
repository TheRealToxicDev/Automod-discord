function hasModrole(message, memDB) {
    if (message.member.roles.has(memDB[message.guild.id].settings.modRole)) return true
    return false
}

module.exports = {
    name: "disable",
    execute(memDB, Database, Discord, message, args) {
        if (hasModrole(message, memDB) || message.author.id == message.guild.ownerID) {
            if (memDB[message.guild.id][message.channel.id]) {
                if (memDB[message.guild.id][message.channel.id].am_enabled) {
                    memDB[message.guild.id][message.channel.id].am_enabled = false

                    const db = new Database("am.db", { fileMustExist: true })

                    db.prepare("UPDATE data SET am_enabled = ? WHERE serverID = ? AND channelID = ?").run(0, message.guild.id, message.channel.id)

                    db.close()

                    message.channel.send("Automod has been disabled.").catch(console.error)
                } else {
                    message.channel.send("Automod is already disabled.").catch(console.error)
                }
            } else {
                memDB[message.guild.id][message.channel.id] = {am_enabled: false}

                const db = new Database("am.db", { fileMustExist: true })

                db.prepare("INSERT INTO data (serverID, channelID) VALUES (?, ?)").run(message.guild.id, message.channel.id)

                db.close()

                message.channel.send("Automod is already disabled.").catch(console.error)
            }
        } else {
            message.channel.send("<@" + message.author.id + "> You don't have permission to use this command.").catch(console.error)
        }
    }
}