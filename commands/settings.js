function hasModrole(message, memDB) {
    if (message.member.roles.has(memDB[message.guild.id].settings.modRole)) return true
    return false
}

module.exports = {
    name: "settings",
    execute(memDB, Database, Discord, message, args) {
        if (hasModrole(message, memDB) || message.author.id == message.guild.ownerID) {
            if (args[0] == "modrole") {
                if (args[1]) {
                    if (args[1] == "remove") {
                        memDB[message.guild.id].settings.modRole = null

                        const db = new Database("am.db", { fileMustExist: true })

                        db.prepare("UPDATE server_settings SET modRole = ? WHERE serverID = ?").run(null, message.guild.id)

                        db.close()

                        return message.channel.send("The mod role has been removed.").catch(console.error)
                    } else if (args[1] == "exempt") {
                        if (args[2]) {
                            if (args[2] == "true" || args[2] == "false") {
                                const value = args[2] == "true" ? 1 : 0

                                if (memDB[message.guild.id].settings.modRoleExempt && value) {
                                    return message.channel.send("Modrole is already exempt").catch(console.error)
                                } else if (!memDB[message.guild.id].settings.modRoleExempt && !value) {
                                    return message.channel.send("Modrole is already not exempt").catch(console.error)
                                }

                                memDB[message.guild.id].settings.modRoleExempt = value

                                const db = new Database("am.db", { fileMustExist: true })

                                db.prepare("UPDATE server_settings SET modRoleExempt = ? WHERE serverID = ?").run(value, message.guild.id)

                                db.close()

                                const word = args[2] == "true" ? "" : " not"

                                return message.channel.send("Modrole is now" + word + " exempt from punishment").catch(console.error)
                            } else {
                                return message.channel.send("Usage: `!am settings modrole exempt [true | false]`").catch(console.error)
                            }
                        } else {
                            if (memDB[message.guild.id].settings.modRoleExempt) {
                                return message.channel.send("Modrole is exempt from punishment").catch(console.error)
                            } else {
                                return message.channel.send("Modrole is not exempt from punishment").catch(console.error)
                            }
                        }
                    }

                    if (message.mentions.roles.size != 1) {
                        return message.channel.send("Please specify one mod role.").catch(console.error)
                    } else if (!/(<@&[0-9]+>)/.test(args[1])) {
                        return message.channel.send("Usage: `!am settings modrole @modrole`").catch(console.error)
                    }

                    memDB[message.guild.id].settings.modRole = message.mentions.roles.first().id

                    const db = new Database("am.db", { fileMustExist: true })

                    db.prepare("UPDATE server_settings SET modRole = ? WHERE serverID = ?").run(message.mentions.roles.first().id, message.guild.id)

                    db.close()

                    message.channel.send("The mod role has been set.").catch(console.error)
                } else {
                    if (memDB[message.guild.id].settings.modRole) {
                        message.channel.send("Modrole is <@&" + memDB[message.guild.id].settings.modRole + ">")
                        .catch(console.error)
                    } else {
                        message.channel.send("Modrole has not been set.")
                        .catch(console.error)
                    } 
                }
            } else if (args[0] == "threshold") {
                if (args[1]) {
                    if (args[1] < 1 || args[1] > 99 || /[^0-9]/.test(args[1])) {
                        return message.channel.send("Please provide a number between 1 and 99.").catch(console.error)
                    }

                    const newThreshold = args[1] / 100

                    if (newThreshold == memDB[message.guild.id].settings.threshold) return message.channel.send("The threshold is already at " + args[1] + "%.").catch(console.error)

                    memDB[message.guild.id].settings.threshold = newThreshold

                    const db = new Database("am.db", { fileMustExist: true })

                    db.prepare("UPDATE server_settings SET threshold = ? WHERE serverID = ?").run(newThreshold, message.guild.id)

                    db.close()

                    message.channel.send("The threshold has been set to " + args[1] + "%.")
                    .catch(console.error)
                } else {
                    message.channel.send("Threshold is at " + memDB[message.guild.id].settings.threshold * 100 + "%.")
                    .catch(console.error)
                }
            } else if (args[0] == "tags") {
                if (args[1]) {
                    if (args[1] == "identity_attack" || args[1] == "insult" || args[1] == "obscene" || args[1] == "severe_toxicity" || args[1] == "sexual_explicit" || args[1] == "threat" || args[1] == "toxicity") {
                        if (args[2] == "true" || args[2] == "false") {
                            const tagOnOff = args[2] == "true" ? 1 : 0
                            memDB[message.guild.id].settings[args[1]] = tagOnOff

                            const db = new Database("am.db", { fileMustExist: true })

                            db.prepare("UPDATE server_settings SET " + args[1] + " = ? WHERE serverID = ?").run(tagOnOff, message.guild.id)

                            db.close()

                            message.channel.send(args[1] + " has been set to " + args[2] + ".")
                            .catch(console.error)
                        } else {
                            message.channel.send("Tags can be set to either `true` or `false`")
                            .catch(console.error)
                        }
                    } else {
                        message.channel.send("Please provide a valid tag.\nTags:\n`identity_attack`\n`insult`\n`obscene`\n`severe_toxicity`\n`sexual_explicit`\n`threat`")
                        .catch(console.error)
                    }
                } else {
                    let value = () => {
                        let arr = []
                        arr[0] = memDB[message.guild.id].settings.identity_attack ? "true" : "false"
                        arr[1] = memDB[message.guild.id].settings.insult ? "true" : "false"
                        arr[2] = memDB[message.guild.id].settings.obscene ? "true" : "false"
                        arr[3] = memDB[message.guild.id].settings.severe_toxicity ? "true" : "false"
                        arr[4] = memDB[message.guild.id].settings.sexual_explicit ? "true" : "false"
                        arr[5] = memDB[message.guild.id].settings.threat ? "true" : "false"
                        arr[6] = memDB[message.guild.id].settings.toxicity ? "true" : "false"

                        value = arr
                    }

                    value()

                    message.channel.send(new Discord.RichEmbed()
                    .setColor('#0099ff')
                    .setTitle("Tags")
                    .addField("Identity attack", value[0])
                    .addField("Insult", value[1])
                    .addField("Obscene", value[2])
                    .addField("Severe toxicity", value[3])
                    .addField("Sexual explicit", value[4])
                    .addField("Threat", value[5])
                    .addField("Toxicity", value[6] + "\n\nEnabling tags will only delete messages that get classified with one of the enabled tags. Setting every tag to false will result in the message getting deleted if it contains any of the tags.")
                    ).catch(console.error)
                }
            } else if (args[0] == "log") {
                if (args[1]) {
                    if (args[1] == "off") {
                        if (memDB[message.guild.id].settings.loggingChannel) {
                            memDB[message.guild.id].settings.loggingChannel = null

                            const db = new Database("am.db", { fileMustExist: true })

                            db.prepare("UPDATE server_settings SET loggingChannel = ? WHERE serverID = ?").run(null, message.guild.id)

                            db.close()

                            return message.channel.send("Logging has been disabled.")
                            .catch(console.error)
                        } else {
                            return message.channel.send("Logging is already disabled.")
                            .catch(console.error)
                        }
                    }

                    if (message.mentions.channels.size != 1) return message.channel.send("Please mention one logging channel.").catch(console.error)
                    if (!/(<#[0-9]+>)/.test(args[1])) return message.channel.send("Usage: !am settings log #channelname").catch(console.error)

                    memDB[message.guild.id].settings.loggingChannel = message.mentions.channels.first().id

                    const db = new Database("am.db", { fileMustExist: true })

                    db.prepare("UPDATE server_settings SET loggingChannel = ? WHERE serverID = ?").run(message.mentions.channels.first().id, message.guild.id)

                    db.close()

                    message.channel.send("Logging channel has been set to <#" + message.mentions.channels.first().id + ">")
                    .catch(console.error)
                } else {
                    if (memDB[message.guild.id].settings.loggingChannel) {
                        message.channel.send("Logging channel is <#" + memDB[message.guild.id].settings.loggingChannel + ">")
                        .catch(console.error)
                    } else {
                        message.channel.send("Logging channel is not set.")
                        .catch(console.error)
                    }
                }
            } else if (args[0] == "punishment") {
                if (args[1]) {
                    if (args[1] == "delete" || args[1] == "temp_mute" || args[1] == "kick" || args[1] == "softban" || args[1] == "ban") {
                        if ((/[^0-9]/.test(args[2]) || args[2] < 0 || args[0] > 1000) && args[2] != "off") {
                            return message.channel.send("Please provide a valid number between 0 and 1000 or set the tag to off.")
                            .catch(console.error)
                        } else if (args[1] == "temp_mute") {
                            if (!memDB[message.guild.id].settings.muteRole) {
                                return message.channel.send("You have to specify a mute role before activating temp mutes. You can do that with `!am settings muterole @muterole`").catch(console.error)
                            } else if (!memDB[message.guild.id].settings.muteDuration) {
                                return message.channel.send("You have to set a mute duration before activating temp mutes. You can do that with `!am settings muteduration durationInSeconds`").catch(console.error)
                            }
                        }

                        const value = args[1] == "delete" ? "deleted" : args[1]
                        const value2 = args[2] == "off" ? null : args[2]

                        memDB[message.guild.id].settings[value] = value2

                        const db = new Database("am.db", { fileMustExist: true })

                        db.prepare("UPDATE server_settings SET " + value + " = ? WHERE serverID = ?").run(value2, message.guild.id)

                        db.close()

                        if (args[2]) {
                            message.channel.send(args[1] + " has been set to off")
                            .catch(console.error)
                        } else {
                            message.channel.send(args[1] + " has been set to " + args[2] + " make sure that the bot has the right permissions or nothing will happen (even though it will still log that it did it).")
                            .catch(console.error)
                        }
                    } else {
                        message.channel.send(new Discord.RichEmbed()
                        .setColor('#0099ff')
                        .setDescription("`delete`\n`temp_mute`\n`kick`\n`softban`\n`ban`")
                        ).catch(console.error)
                    }
                } else {
                    message.channel.send(new Discord.RichEmbed()
                    .setColor('#0099ff')
                    .setTitle("Values")
                    .addField("Delete", memDB[message.guild.id].settings.deleted != null ? memDB[message.guild.id].settings.deleted : "off")
                    .addField("Temp mute", memDB[message.guild.id].settings.temp_mute != null ? memDB[message.guild.id].settings.temp_mute : "off")
                    .addField("Kick", memDB[message.guild.id].settings.kick != null ? memDB[message.guild.id].settings.kick : "off")
                    .addField("Softban", memDB[message.guild.id].settings.softban != null ? memDB[message.guild.id].settings.softban : "off")
                    .addField("Ban", (memDB[message.guild.id].settings.ban != null ? memDB[message.guild.id].settings.ban : "off") + "\n\nThese values specify what to do after x amount of infractions. Setting a value to 0 means it will execute instantly on any infraction.")
                    ).catch(console.error)
                }
            } else if (args[0] == "muterole") {
                if (args[1]) {
                    if (message.mentions.roles.size != 1) {
                        return message.channel.send("Please specify one muterole.")
                        .catch(console.error)
                    } else if (!/(<@&[0-9]+>)/.test(args[1])) {
                        return message.channel.send("Usage: `!am settings muterole @muterole`")
                        .catch(console.error)
                    }

                    const id = args[1].slice(3, args[1].length - 1)

                    memDB[message.guild.id].settings.muteRole = id

                    const db = new Database("am.db", { fileMustExist: true })

                    db.prepare("UPDATE server_settings SET muteRole = ? WHERE serverID = ?").run(id, message.guild.id)

                    db.close()

                    message.channel.send("Mute role has been set to " + args[1]).catch(console.error)
                } else {
                    if (memDB[message.guild.id].settings.muteRole) {
                        message.channel.send("Mute role is <@&" + memDB[message.guild.id].settings.muteRole + ">")
                        .catch(console.error)
                    } else {
                        message.channel.send("Mute role has not been set.")
                        .catch(console.error)
                    }
                }
            } else if (args[0] == "muteduration") {
                if (args[1]) {
                    if (/[^0-9]/.test(args[1]) || args[1] < 1 || args[1] > 50000) {
                        return message.channel.send("Please provide a valid number between 1 and 50000.").catch(console.error)
                    }

                    memDB[message.guild.id].settings.muteDuration = args[1] * 1000

                    const db = new Database("am.db", { fileMustExist: true })

                    db.prepare("UPDATE server_settings SET muteDuration = ? WHERE serverID = ?").run(args[1] * 1000, message.guild.id)

                    db.close()

                    message.channel.send("Mute duration has been set to " + args[1] + " seconds.")
                    .catch(console.error)
                } else {
                    if (memDB[message.guild.id].settings.muteDuration == 0) {
                        message.channel.send("Mute duration has not been set.")
                        .catch(console.error)
                    } else {
                        message.channel.send("Mute duration is " + memDB[message.guild.id].settings.muteDuration / 1000 + " seconds.")
                        .catch(console.error)
                    }
                }
            }
        } else {
            message.channel.send("<@" + message.author.id + "> You don't have permission to use this command.").catch(console.error)
        }
    }
}
