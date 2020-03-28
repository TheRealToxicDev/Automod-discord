function hasModrole(message, memDB) {
    if (message.member.roles.cache.has(memDB[message.guild.id].settings.modRole)) return true;
    return false;
}

module.exports = {
    name: "info",
    execute(memDB, Database, Discord, message, args) {
        if (!hasModrole(message, memDB) && message.author.id != message.guild.ownerID) {
            message.channel.send(`<@${message.author.id}> You don't have permission to use this command.`).catch(console.error);
            return;
        }

        if (!args[0]) {
            message.channel.send("Please mention a user or use his id directly.").catch(console.error);
            return;
        }

        if (args[0] == "reset") {
            const userMentioned = /(?<nameMention><@[0-9]+>)|(?<nicknameMention><@![0-9]+>)/.test(args[1]);

            if (message.mentions.users > 1) {
                message.channel.send("You can only reset info on one user.").catch(console.error);
                return;
            } else if (!userMentioned && !/[0-9]+/.test(args[1])) {
                message.channel.send("Usage: `!am info reset [@user OR userID]`").catch(console.error);
                return;
            }

            if (userMentioned) {
                let user = args[1].slice(2, args[1].length - 1);
                if (user.startsWith("!")) user = user.substr(1);

                const guild_id = message.guild.id;
                const user_data = memDB[guild_id].user_data[user];
                const user_data_internal = memDB[guild_id].user_data_internal[user];

                if (user_data) {
                    user_data.total_infractions = 0;
                    user_data.deleted = 0;
                    user_data.temp_mute = 0;
                    user_data.kick = 0;
                    user_data.softban = 0;
                    user_data.ban = 0;

                    user_data_internal.deleted = 0;
                    user_data_internal.temp_mute = 0;
                    user_data_internal.kick = 0;
                    user_data_internal.softban = 0;
                    user_data_internal.ban = 0;
                    
                    const db = new Database("am.db", { fileMustExist: true });
                    db.prepare("UPDATE user_data SET total_infractions = ?, deleted = ?, temp_mute = ?, kick = ?, softban = ?, ban = ? WHERE serverID = ? AND userID = ?").run(0, 0, 0, 0, 0, 0, message.guild.id, user);
                    db.prepare("UPDATE user_data_internal SET deleted = ?, temp_mute = ?, kick = ?, softban = ?, ban = ? WHERE serverID = ? AND userID = ?").run(0, 0, 0, 0, 0, message.guild.id, user);
                    db.close();

                    message.channel.send(`Reset info of ${args[1]}`).catch(console.error);
                } else {
                    message.channel.send("I have no information about this user. The user is either not on this server or has no infractions.").catch(console.error);
                }
            } else {
                const guild_id = message.guild.id;
                const user_data = memDB[guild_id].user_data[args[1]];
                const user_data_internal = memDB[guild_id].user_data_internal[args[1]];

                if (user_data) {
                    user_data.total_infractions = 0;
                    user_data.deleted = 0;
                    user_data.temp_mute = 0;
                    user_data.kick = 0;
                    user_data.softban = 0;
                    user_data.ban = 0;

                    user_data_internal.deleted = 0;
                    user_data_internal.temp_mute = 0;
                    user_data_internal.kick = 0;
                    user_data_internal.softban = 0;
                    user_data_internal.ban = 0;

                    const db = new Database("am.db", { fileMustExist: true });
                    db.prepare("UPDATE user_data SET total_infractions = ?, deleted = ?, temp_mute = ?, kick = ?, softban = ?, ban = ? WHERE serverID = ? AND userID = ?").run(0, 0, 0, 0, 0, 0, message.guild.id, args[2]);
                    db.prepare("UPDATE user_data_internal SET deleted = ?, temp_mute = ?, kick = ?, softban = ?, ban = ? WHERE serverID = ? AND userID = ?").run(0, 0, 0, 0, 0, message.guild.id, args[2]);
                    db.close();

                    message.channel.send(`Reset info of ${args[1]}`).catch(console.error);
                } else {
                    message.channel.send("I have no information about this user. The user is either not on this server or has no infractions.").catch(console.error);
                }
            }
        } else {
            const userMentioned = /(?<nameMention><@[0-9]+>)|(?<nicknameMention><@![0-9]+>)/.test(args[0]);

            if (message.mentions.users > 1) {
                message.channel.send("You can only get info on one user.").catch(console.error);
                return;
            } else if (!userMentioned && !/[0-9]+/.test(args[0])) {
                message.channel.send("Usage: `!am info [@user OR userID]`").catch(console.error);
                return;
            }

            if (userMentioned) {
                let user = args[0].slice(2, args[0].length - 1);
                if (user.startsWith("!")) user = user.substr(1);

                const user_data = memDB[message.guild.id].user_data[user];

                if (user_data) {
                    message.channel.send(new Discord.MessageEmbed()
                        .setColor("#0099ff")
                        .setTitle("User data")
                        .setDescription("User id: " + user)
                        .addField("Total infractions", user_data.total_infractions)
                        .addField("Delete", user_data.deleted)
                        .addField("Temp mute", user_data.temp_mute)
                        .addField("Kick", user_data.kick)
                        .addField("Softban", user_data.softban)
                        .addField("Ban", user_data.ban)
                    ).catch(console.error);
                } else {
                    message.channel.send("I have no information about this user. The user is either not on this server or has no infractions.").catch(console.error);
                }
            } else {
                const user_data = memDB[message.guild.id].user_data[args[0]];

                if (user_data) {
                    message.channel.send(new Discord.MessageEmbed()
                        .setColor("#0099ff")
                        .setTitle("User data")
                        .setDescription("User id: " + args[0])
                        .addField("Total infractions", user_data.total_infractions)
                        .addField("Delete", user_data.deleted)
                        .addField("Temp mute", user_data.temp_mute)
                        .addField("Kick", user_data.kick)
                        .addField("Softban", user_data.softban)
                        .addField("Ban", user_data.ban)
                    ).catch(console.error);
                } else {
                    message.channel.send("I have no information about this user. The user is either not on this server or has no infractions.").catch(console.error);
                }
            } 
        }
    }
};