function hasModrole(message, memDB) {
    if (message.member.roles.has(memDB[message.guild.id].settings.modRole)) return true;
    return false;
}

module.exports = {
    name: "settings",
    // eslint-disable-next-line complexity
    execute(memDB, Database, Discord, message, args) {
        if (!hasModrole(message, memDB) && message.author.id != message.guild.ownerID) {
            message.channel.send("<@" + message.author.id + "> You don't have permission to use this command.").catch(console.error);
            return;
        }

        if (args[0] == "modrole") {
            const modrole = memDB[message.guild.id].settings.modRole;

            if (!args[1]) {
                if (modrole) {
                    message.channel.send("Modrole is <@&" + modrole + ">")
                    .catch(console.error);
                } else {
                    message.channel.send("Modrole has not been set.")
                    .catch(console.error);
                }

                return;
            }

            if (args[1] == "remove") {
                memDB[message.guild.id].settings.modRole = null;

                const db = new Database("am.db", { fileMustExist: true });
                db.prepare("UPDATE server_settings SET modRole = ? WHERE serverID = ?").run(null, message.guild.id);
                db.close();

                message.channel.send("The mod role has been removed.").catch(console.error);
                return;
            } else if (args[1] == "exempt") {
                const modRoleExempt = memDB[message.guild.id].settings.modRoleExempt;

                if (!args[2]) {
                    if (modRoleExempt) {
                        message.channel.send("Modrole is exempt from punishment").catch(console.error);
                        return;
                    }

                    message.channel.send("Modrole is not exempt from punishment").catch(console.error);
                    return;
                }


                if (args[2] == "true" || args[2] == "false") {
                    const value = args[2] == "true" ? 1 : 0;

                    if (modRoleExempt && value) {
                        message.channel.send("Modrole is already exempt").catch(console.error);
                        return;
                    } else if (!modRoleExempt && !value) {
                        message.channel.send("Modrole is already not exempt").catch(console.error);
                        return;
                    }

                    memDB[message.guild.id].settings.modRoleExempt = value;

                    const db = new Database("am.db", { fileMustExist: true });
                    db.prepare("UPDATE server_settings SET modRoleExempt = ? WHERE serverID = ?").run(value, message.guild.id);
                    db.close();

                    const word = args[2] == "true" ? "" : " not";

                    message.channel.send("Modrole is now" + word + " exempt from punishment").catch(console.error);
                    return;
                }

                message.channel.send("Usage: `!am settings modrole exempt [true | false]`").catch(console.error);
                return;
            }

            if (message.mentions.roles.size != 1) {
                message.channel.send("Please specify one mod role.").catch(console.error);
                return;
            } else if (!/(?<roleMention><@&[0-9]+>)/.test(args[1])) {
                message.channel.send("Usage: `!am settings modrole @modrole`").catch(console.error);
                return;
            }

            const mention = message.mentions.roles.first().id;

            memDB[message.guild.id].settings.modRole = mention;

            const db = new Database("am.db", { fileMustExist: true });
            db.prepare("UPDATE server_settings SET modRole = ? WHERE serverID = ?").run(mention, message.guild.id);
            db.close();

            message.channel.send("The mod role has been set.").catch(console.error);
        } else if (args[0] == "threshold") {
            const threshold = memDB[message.guild.id].settings.threshold;

            if (!args[1]) {
                message.channel.send("Threshold is at " + threshold * 100 + "%.").catch(console.error);
                return;
            }

            if (args[1] < 1 || args[1] > 99 || /[^0-9]/.test(args[1])) {
                message.channel.send("Please provide a number between 1 and 99.").catch(console.error);
                return;
            }

            const newThreshold = args[1] / 100;

            if (newThreshold == threshold) {
                message.channel.send("The threshold is already at " + args[1] + "%.").catch(console.error);
                return;
            }

            memDB[message.guild.id].settings.threshold = newThreshold;

            const db = new Database("am.db", { fileMustExist: true });
            db.prepare("UPDATE server_settings SET threshold = ? WHERE serverID = ?").run(newThreshold, message.guild.id);
            db.close();

            message.channel.send("The threshold has been set to " + args[1] + "%.").catch(console.error);
        } else if (args[0] == "tags") {
            if (!args[1]) {
                const settings = memDB[message.guild.id].settings;

                message.channel.send(new Discord.RichEmbed()
                    .setColor("#0099ff")
                    .setTitle("Tags")
                    .addField("Identity attack", settings.identity_attack ? "true" : "false")
                    .addField("Insult", settings.insult ? "true" : "false")
                    .addField("Obscene", settings.obscene ? "true" : "false")
                    .addField("Severe toxicity", settings.severe_toxicity ? "true" : "false")
                    .addField("Sexual explicit", settings.sexual_explicit ? "true" : "false")
                    .addField("Threat", settings.threat ? "true" : "false")
                    .addField("Toxicity", (settings.toxicity ? "true" : "false") + "\n\nEnabling tags will only delete messages that get classified with one of the enabled tags. Setting every tag to false will result in the message getting deleted if it contains any of the tags.")
                ).catch(console.error);

                return;
            }

            if (args[1] == "identity_attack" || args[1] == "insult" || args[1] == "obscene" || args[1] == "severe_toxicity" || args[1] == "sexual_explicit" || args[1] == "threat" || args[1] == "toxicity") {
                if (args[2] != "true" || args[2] != "false") {
                    message.channel.send("Tags can be set to either `true` or `false`").catch(console.error);
                    return;
                }

                const tagOnOff = args[2] == "true" ? 1 : 0;
                memDB[message.guild.id].settings[args[1]] = tagOnOff;

                const db = new Database("am.db", { fileMustExist: true });
                db.prepare("UPDATE server_settings SET " + args[1] + " = ? WHERE serverID = ?").run(tagOnOff, message.guild.id);
                db.close();

                message.channel.send(args[1] + " has been set to " + args[2] + ".").catch(console.error);
            } else {
                message.channel.send("Please provide a valid tag.\nTags:\n`identity_attack`\n`insult`\n`obscene`\n`severe_toxicity`\n`sexual_explicit`\n`threat`").catch(console.error);
            }
        } else if (args[0] == "log") {
            const guild_id = message.guild.id;
            const loggingChannel = memDB[guild_id].settings.loggingChannel;

            if (!args[1]) {
                if (memDB[guild_id].settings.loggingChannel) {
                    message.channel.send("Logging channel is <#" + loggingChannel + ">").catch(console.error);
                } else {
                    message.channel.send("Logging channel is not set.").catch(console.error);
                }

                return;
            }

            if (args[1] == "off") {
                if (loggingChannel) {
                    memDB[guild_id].settings.loggingChannel = null;

                    const db = new Database("am.db", { fileMustExist: true });
                    db.prepare("UPDATE server_settings SET loggingChannel = ? WHERE serverID = ?").run(null, guild_id);
                    db.close();

                    message.channel.send("Logging has been disabled.").catch(console.error);
                    return;
                }

                message.channel.send("Logging is already disabled.").catch(console.error);
                return;
            }

            if (message.mentions.channels.size != 1) {
                message.channel.send("Please mention one logging channel.").catch(console.error);
                return;
            }
            if (!/(?<channelMention><#[0-9]+>)/.test(args[1])) {
                message.channel.send("Usage: !am settings log #channelname").catch(console.error);
                return;
            }

            const mention = message.mentions.channels.first().id;

            memDB[guild_id].settings.loggingChannel = mention;

            const db = new Database("am.db", { fileMustExist: true });
            db.prepare("UPDATE server_settings SET loggingChannel = ? WHERE serverID = ?").run(mention, guild_id);
            db.close();

            message.channel.send("Logging channel has been set to <#" + mention + ">").catch(console.error);
        } else if (args[0] == "punishment") {
            const guild_id = message.guild.id;
            const settings = memDB[guild_id].settings;

            if (!args[1]) {
                message.channel.send(new Discord.RichEmbed()
                    .setColor("#0099ff")
                    .setTitle("Values")
                    .addField("Delete", settings.deleted != null ? settings.deleted : "off")
                    .addField("Temp mute", settings.temp_mute != null ? settings.temp_mute : "off")
                    .addField("Kick", settings.kick != null ? settings.kick : "off")
                    .addField("Softban", settings.softban != null ? settings.softban : "off")
                    .addField("Ban", (settings.ban != null ? settings.ban : "off") + "\n\nThese values specify what to do after x amount of infractions. Setting a value to 0 means it will execute instantly on any infraction.")
                ).catch(console.error);

                return;
            }

            if (args[1] == "delete" || args[1] == "temp_mute" || args[1] == "kick" || args[1] == "softban" || args[1] == "ban") {
                if ((/[^0-9]/.test(args[2]) || args[2] < 0 || args[0] > 1000) && args[2] != "off") {
                    message.channel.send("Please provide a valid number between 0 and 1000 or set the tag to off.").catch(console.error);
                    return;
                } else if (args[1] == "temp_mute") {
                    if (!settings.muteRole) {
                        message.channel.send("You have to specify a mute role before activating temp mutes. You can do that with `!am settings muterole @muterole`").catch(console.error);
                        return;
                    } else if (!settings.muteDuration) {
                        message.channel.send("You have to set a mute duration before activating temp mutes. You can do that with `!am settings muteduration durationInSeconds`").catch(console.error);
                        return;
                    }
                }

                const value = args[1] == "delete" ? "deleted" : args[1];
                const value2 = args[2] == "off" ? null : args[2];

                memDB[guild_id].settings[value] = value2;

                const db = new Database("am.db", { fileMustExist: true });
                db.prepare("UPDATE server_settings SET " + value + " = ? WHERE serverID = ?").run(value2, guild_id);
                db.close();

                if (!value2) {
                    message.channel.send(args[1] + " has been set to off")
                    .catch(console.error);
                } else {
                    message.channel.send(args[1] + " has been set to " + args[2] + " make sure that the bot has the right permissions or nothing will happen (even though it will still log that it did it).")
                    .catch(console.error);
                }
            } else {
                message.channel.send(new Discord.RichEmbed()
                    .setColor("#0099ff")
                    .setDescription("Possible values:\n`delete`\n`temp_mute`\n`kick`\n`softban`\n`ban`")
                ).catch(console.error);
            }
        } else if (args[0] == "muterole") {
            const guild_id = message.guild.id;
            const settings = memDB[guild_id].settings;

            if (!args[1]) {
                if (settings.muteRole) {
                    message.channel.send("Mute role is <@&" + settings.muteRole + ">").catch(console.error);
                } else {
                    message.channel.send("Mute role has not been set.").catch(console.error);
                }

                return;
            }

            if (message.mentions.roles.size != 1) {
                message.channel.send("Please specify one muterole.").catch(console.error);
                return;
            } else if (!/(?<roleMention><@&[0-9]+>)/.test(args[1])) {
                message.channel.send("Usage: `!am settings muterole @muterole`").catch(console.error);
                return;
            }

            const id = args[1].slice(3, args[1].length - 1);

            memDB[guild_id].settings.muteRole = id;

            const db = new Database("am.db", { fileMustExist: true });
            db.prepare("UPDATE server_settings SET muteRole = ? WHERE serverID = ?").run(id, guild_id);
            db.close();

            message.channel.send("Mute role has been set to " + args[1]).catch(console.error);
        } else if (args[0] == "muteduration") {
            const guild_id = message.guild.id;
            const settings = memDB[guild_id].settings;

            if (!args[1]) {
                if (settings.muteDuration == 0) {
                    message.channel.send("Mute duration has not been set.").catch(console.error);
                } else {
                    message.channel.send("Mute duration is " + settings.muteDuration / 1000 + " seconds.").catch(console.error);
                }

                return;
            }

            if (/[^0-9]/.test(args[1]) || args[1] < 1 || args[1] > 50000) {
                message.channel.send("Please provide a valid number between 1 and 50000.").catch(console.error);
                return;
            }

            memDB[guild_id].settings.muteDuration = args[1] * 1000;

            const db = new Database("am.db", { fileMustExist: true });
            db.prepare("UPDATE server_settings SET muteDuration = ? WHERE serverID = ?").run(args[1] * 1000, guild_id);
            db.close();

            message.channel.send("Mute duration has been set to " + args[1] + " seconds.").catch(console.error);
        }
    }
};