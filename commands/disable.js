function hasModrole(message, memDB) {
    if (message.member.roles.has(memDB[message.guild.id].settings.modRole)) return true;
    return false;
}

module.exports = {
    name: "disable",
    execute(memDB, Database, Discord, message) {
        if (!hasModrole(message, memDB) && message.author.id != message.guild.ownerID) {
            message.channel.send("<@" + message.author.id + "> You don't have permission to use this command.").catch(console.error);
            return;
        }

        const guild_id = message.guild.id;
        const channel_id = message.channel.id;
        const channel = memDB[guild_id][channel_id];

        if (channel) {
            if (channel.am_enabled) {
                channel.am_enabled = false;

                const db = new Database("am.db", { fileMustExist: true });
                db.prepare("UPDATE data SET am_enabled = ? WHERE serverID = ? AND channelID = ?").run(0, guild_id, channel_id);
                db.close();

                message.channel.send("Automod has been disabled.").catch(console.error);
            } else {
                message.channel.send("Automod is already disabled.").catch(console.error);
            }
        } else {
            memDB[guild_id][channel_id] = { am_enabled: false };

            const db = new Database("am.db", { fileMustExist: true });
            db.prepare("INSERT INTO data (serverID, channelID) VALUES (?, ?)").run(guild_id, channel_id);
            db.close();

            message.channel.send("Automod is already disabled.").catch(console.error);
        }
    }
};