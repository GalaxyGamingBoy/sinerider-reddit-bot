import * as dotenv from "dotenv";
import Snoowrap from "snoowrap";
import { Commands } from "./src/Commands";
dotenv.config();

const r = new Snoowrap({
    userAgent: process.env.R_USERAGENT || "",
    clientId: process.env.R_CLIENTID || "",
    password: process.env.R_PASSWORD || "",
    username: process.env.R_USERNAME || "",
    clientSecret: process.env.R_SECRET || "",
});

const runCommand = (comment: Snoowrap.Comment) => {
    // Loop through each command
    Commands.forEach((command) => {
        // Check if the comment body contains the `command` handler
        if (comment.body.indexOf(command.handler) != -1) {
            // Run the command in `command`
            command.command(comment);
        }
    });
};

const listenForCommands = () => {
    // Get the new comments in the specified subreddit
    r.getSubreddit("test")
        .getNewComments()
        .then((newComments) => {
            let newValidComments: Array<Snoowrap.Comment> = [];

            // Get All Valid Comments
            newComments.forEach((comment) => {
                Commands.forEach((command) => {
                    // If the command body includes a handler then push it to `newValidComments`
                    if (comment.body.indexOf(command.handler) != 0) {
                        newValidComments.push(comment);
                    }
                });
            });

            // Filter the already replied once
            newValidComments.forEach((comment) => {
                let hasPrevReplied = false;

                // Check each reply
                comment.replies.forEach((rep) => {
                    // If a reply is authored by the bot username, then ignore it
                    if (rep.author.name == r.username) {
                        hasPrevReplied = true;
                    }
                });

                // If no previous reply, then run the command
                if (!hasPrevReplied) {
                    runCommand(comment);
                }
            });
        });
};

setInterval(() => {
    listenForCommands();
}, Number(process.env.B_CHECKDELAY) || 60000);
