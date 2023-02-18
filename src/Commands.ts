import { Command } from "./types/Command";

export const Commands: Array<Command> = [
    {
        handler: "!sinetest",
        command: (comment) => {
            comment.reply("!sinetest called!");
        },
    },
];
