import * as dotenv from 'dotenv';
import Snoowrap from 'snoowrap';
import {Commands} from './Commands';
import StringUtilities from './StringUtilities';
dotenv.config();

// eslint-disable-next-line prefer-const
let repliedComments: Array<string> = [];

const r = new Snoowrap({
  userAgent: process.env.R_USERAGENT || '',
  clientId: process.env.R_CLIENTID || '',
  password: process.env.R_PASSWORD || '',
  username: process.env.R_USERNAME || '',
  clientSecret: process.env.R_SECRET || '',
});

const runCommand = (comment: Snoowrap.Comment) => {
  // Loop through each command
  Commands.forEach(command => {
    // Check if the comment body contains the `command` handler
    // if (comment.body.indexOf(command.handler) !== -1) {
    //   // Run the command in `command`
    //   command.command(comment);
    // }
    comment.body.split(' ').forEach(str => {
      if (StringUtilities.checkRegex(str, command.handler)) {
        command.command(comment);
      }
    });
  });
};

const listenForCommands = () => {
  // Get the new comments in the specified subreddit
  r.getSubreddit(process.env.B_SUBREDDIT || '')
    .getNewComments()
    .then(newComments => {
      const newValidComments: Array<Snoowrap.Comment> = [];

      // Get All Valid Comments
      newComments.forEach(comment => {
        // If the command body includes a handler then push it to `newValidComments`
        if (comment.body.indexOf('!sinerider') !== -1) {
          newValidComments.push(comment);
        }
      });

      // Filter the already replied once
      newValidComments.forEach(comment => {
        if (repliedComments.indexOf(comment.id) === -1) {
          repliedComments.push(comment.id);
          runCommand(comment);
        }
      });
    })
    .catch(e => {
      console.log(
        'Connection failed... Is reddit down? Further analysis: ' + e
      );
    });
};

setInterval(() => {
  listenForCommands();
}, Number(process.env.B_CHECKDELAY) || 60000);

console.log('Reddit Bot Started!');
