function hasModrole(message, memDB) {
    if (message.member.roles.has(memDB[message.guild.id].settings.modRole)) return true
    return false
}

module.exports = {
    name: "info",
    execute(memDB, Database, Discord, message, args) {
        if (hasModrole(message, memDB) || message.author.id == message.guild.ownerID) {
            if (args[0]) {
                if (args[0] == "reset") {
                    const userMentioned = /(<@[0-9]+>)|(<@![0-9]+>)/.test(args[1])

                    if (message.mentions.users > 1) {
                        return message.channel.send("You can only reset info on one user.").catch(console.error)
                    } else if (!userMentioned && !/[0-9]+/.test(args[1])) {
                        return message.channel.send("Usage: `!am info reset [@user OR userID]`").catch(console.error)
                    }

                    if (userMentioned) {
                        let user = args[1].slice(2, args[1].length - 1)
                        if (user.startsWith("!")) user = user.substr(1)

                        if (memDB[message.guild.id].user_data[user]) {
                            memDB[message.guild.id].user_data[user].total_infractions = 0
                            memDB[message.guild.id].user_data[user].deleted = 0
                            memDB[message.guild.id].user_data[user].temp_mute = 0
                            memDB[message.guild.id].user_data[user].kick = 0
                            memDB[message.guild.id].user_data[user].softban = 0
                            memDB[message.guild.id].user_data[user].ban = 0

                            memDB[message.guild.id].user_data_internal[user].deleted = 0
                            memDB[message.guild.id].user_data_internal[user].temp_mute = 0
                            memDB[message.guild.id].user_data_internal[user].kick = 0
                            memDB[message.guild.id].user_data_internal[user].softban = 0
                            memDB[message.guild.id].user_data_internal[user].ban = 0
                            
                            const db = new Database("am.db", { fileMustExist: true })

                            db.prepare("UPDATE user_data SET total_infractions = ?, deleted = ?, temp_mute = ?, kick = ?, softban = ?, ban = ? WHERE serverID = ? AND userID = ?").run(0, 0, 0, 0, 0, 0, message.guild.id, user)
                            db.prepare("UPDATE user_data_internal SET deleted = ?, temp_mute = ?, kick = ?, softban = ?, ban = ? WHERE serverID = ? AND userID = ?").run(0, 0, 0, 0, 0, message.guild.id, user)

                            db.close()

                            message.channel.send("Reset info of " + args[1])
                            .catch(console.error)
                        } else {
                            message.channel.send("I have no information about this user. The user is either not on this server or has no infractions.")
                            .catch(console.error)
                        }
                    } else {
                        if (memDB[message.guild.id].user_data[args[1]]) {
                            memDB[message.guild.id].user_data[args[1]].total_infractions = 0
                            memDB[message.guild.id].user_data[args[1]].deleted = 0
                            memDB[message.guild.id].user_data[args[1]].temp_mute = 0
                            memDB[message.guild.id].user_data[args[1]].kick = 0
                            memDB[message.guild.id].user_data[args[1]].softban = 0
                            memDB[message.guild.id].user_data[args[1]].ban = 0

                            memDB[message.guild.id].user_data_internal[args[1]].deleted = 0
                            memDB[message.guild.id].user_data_internal[args[1]].temp_mute = 0
                            memDB[message.guild.id].user_data_internal[args[1]].kick = 0
                            memDB[message.guild.id].user_data_internal[args[1]].softban = 0
                            memDB[message.guild.id].user_data_internal[args[1]].ban = 0

                            const db = new Database("am.db", { fileMustExist: true })

                            db.prepare("UPDATE user_data SET total_infractions = ?, deleted = ?, temp_mute = ?, kick = ?, softban = ?, ban = ? WHERE serverID = ? AND userID = ?").run(0, 0, 0, 0, 0, 0, message.guild.id, args[2])
                            db.prepare("UPDATE user_data_internal SET deleted = ?, temp_mute = ?, kick = ?, softban = ?, ban = ? WHERE serverID = ? AND userID = ?").run(0, 0, 0, 0, 0, message.guild.id, args[2])
                            
                            db.close()

                            message.channel.send("Reset info of " + args[1])
                            .catch(console.error)
                        } else {
                            message.channel.send("I have no information about this user. The user is either not on this server or has no infractions.")
                            .catch(console.error)
                        }
                    }
                } else {
                    const userMentioned = /(<@[0-9]+>)|(<@![0-9]+>)/.test(args[0])

                    if (message.mentions.users > 1) {
                        return message.channel.send("You can only get info on one user.").catch(console.error)
                    } else if (!userMentioned && !/[0-9]+/.test(args[0])) {
                        return message.channel.send("Usage: `!am info [@user OR userID]`").catch(console.error)
                    }

                    if (userMentioned) {
                        let user = args[0].slice(2, args[0].length - 1)
                        if (user.startsWith("!")) user = user.substr(1)

                        if (memDB[message.guild.id].user_data[user]) {
                            const data = memDB[message.guild.id].user_data[user]

                            message.channel.send(new Discord.RichEmbed()
                            .setColor("#0099ff")
                            .setTitle("User data")
                            .setDescription("User id: " + user)
                            .addField("Total infractions", data.total_infractions)
                            .addField("Delete", data.deleted)
                            .addField("Temp mute", data.temp_mute)
                            .addField("Kick", data.kick)
                            .addField("Softban", data.softban)
                            .addField("Ban", data.ban)
                            ).catch(console.error)
                        } else {
                            message.channel.send("I have no information about this user. The user is either not on this server or has no infractions.")
                            .catch(console.error)
                        }
                    } else {
                        if (memDB[message.guild.id].user_data[args[0]]) {
                            const data = memDB[message.guild.id].user_data[args[0]]

                            message.channel.send(new Discord.RichEmbed()
                            .setColor("#0099ff")
                            .setTitle("User data")
                            .setDescription("User id: " + args[0])
                            .addField("Total infractions", data.total_infractions)
                            .addField("Delete", data.deleted)
                            .addField("Temp mute", data.temp_mute)
                            .addField("Kick", data.kick)
                            .addField("Softban", data.softban)
                            .addField("Ban", data.ban)
                            ).catch(console.error)
                        } else {
                            message.channel.send("I have no information about this user. The user is either not on this server or has no infractions.")
                            .catch(console.error)
                        }
                    } 
                }
            } else {
                message.channel.send("Please mention a user or use his id directly.")
                .catch(console.error)
            }
        } else {
            message.channel.send("<@" + message.author.id + "> You don't have permission to use this command.")
            .catch(console.error)
        }
    }
}
