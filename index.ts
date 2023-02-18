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
    Commands.forEach((command) => {
        if (comment.body.indexOf(command.handler) != -1) {
            command.command(comment);
        }
    });
};

const listenForCommands = () => {
    r.getSubreddit("test")
        .getNewComments()
        .then((newComments) => {
            let newValidComments: Array<Snoowrap.Comment> = [];

            // Get All Valid Comments
            newComments.forEach((comment) => {
                Commands.forEach((command) => {
                    if (comment.body.indexOf(command.handler) != 0) {
                        newValidComments.push(comment);
                    }
                });
            });

            // Filter the already replied once
            newValidComments.forEach((comment) => {
                let hasPrevReplied = false;
                comment.replies.forEach((rep) => {
                    if (rep.author.name == r.username) {
                        hasPrevReplied = true;
                    }
                });

                if (!hasPrevReplied) {
                    runCommand(comment);
                }
            });
        });
};

setInterval(() => {
    listenForCommands();
}, Number(process.env.B_CHECKDELAY) || 60000);
