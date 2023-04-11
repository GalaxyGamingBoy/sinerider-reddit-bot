/* eslint-disable eqeqeq */
import * as dotenv from 'dotenv';
import Snoowrap from 'snoowrap';
// eslint-disable-next-line prettier/prettier
import { Commands } from './Commands';
import StringUtilities from './StringUtilities';
import passport from 'passport';
// eslint-disable-next-line prettier/prettier
import { BasicStrategy } from 'passport-http';
import express from 'express';
import CORS from 'cors';
import bodyParser from 'body-parser';
// eslint-disable-next-line prettier/prettier
import { airtableSetup } from './AirtableIntegration';
// eslint-disable-next-line prettier/prettier
import { RegExpLib } from './RegExpLib';

dotenv.config();

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
    comment.body.split(' ').forEach(str => {
      if (StringUtilities.checkRegex(str, command.handler)) {
        command.command(comment, command.command);
      }
    });
  });
};

// eslint-disable-next-line prefer-const
let repliedComments: Set<String> = new Set();

const listenForCommands = () => {
  airtableSetup('RedditCheckedID')
    .select()
    .eachPage(
      (records, fetchNextPage) => {
        records.forEach(record => {
          // Add the id of the replied comment
          if (!repliedComments.has(record.get('id').toString())) {
            repliedComments.add(record.get('id').toString());
          }
        });
        fetchNextPage();
      },
      err => {
        if (err) {
          console.log(err);
          return;
        }
      }
    );

  // Get the new comments in the specified subreddit
  r.getSubreddit(process.env.B_SUBREDDIT || '')
    .getNewComments()
    .then(newComments => {
      // eslint-disable-next-line prefer-const
      let newValidComments: Array<Snoowrap.Comment> = [];

      // Get All Valid Comments
      newComments.forEach(comment => {
        // If the command body includes a handler then push it to `newValidComments`
        if (comment.body.indexOf('!sinerider') !== -1) {
          newValidComments.push(comment);
        }
      });

      // Filter the already replied once
      newValidComments.forEach(comment => {
        if (!repliedComments.has(comment.id)) {
          // eslint-disable-next-line prettier/prettier
          airtableSetup('RedditCheckedID').create({ id: comment.id });
          repliedComments.add(comment.id);
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

const addNewDailyLevel = (
  title: string,
  body: string,
  levelName: string,
  url: string
) => {
  // Get Daily Level Sticky & Remove it
  r.getSubreddit(process.env.B_SUBREDDIT || '')
    .getSticky()
    .then(sticky => {
      if (sticky.title.startsWith('Daily Level')) {
        sticky.unsticky();
      }
    });

  // Post New Daily Level Sticky
  r.getSubreddit(process.env.B_SUBREDDIT || '')
    .submitSelfpost({
      title: `Daily Level | ${title} | ${levelName}`,
      text: `${body}  [Play it here](${url})`,
      subredditName: process.env.B_SUBREDDIT || '',
    })
    .then(post => post.sticky());
};

const app = express();

app.use(CORS());
app.use(bodyParser.json());
passport.use(
  new BasicStrategy((username, password, done) => {
    if (
      username == 'hackclub' &&
      password == process.env.SINERIDER_API_SECRET
    ) {
      return done(null, 'hackclub');
    } else {
      // Error
      return done(null, false);
    }
  })
);

app.post(
  '/postDaily',
  // eslint-disable-next-line prettier/prettier
  passport.authenticate('basic', { session: false }),
  (req, res) => {
    if (
      RegExpLib.URL.regexp.test(req.body.url) &&
      req.body.body &&
      req.body.title &&
      req.body.levelName
    ) {
      addNewDailyLevel(
        req.body.title,
        req.body.body,
        req.body.levelName,
        req.body.url
      );
    }
    res.status(200).end('OK!');
  }
);

app.listen(process.env.EXPRESS_PORT || 3000, () => {
  console.log(
    `Doing magic in port ${process.env.EXPRESS_PORT || 3000}, Have fun!`
  );
});

setInterval(() => {
  console.log('Checking for new comments...');
  listenForCommands();
}, Number(process.env.B_CHECKDELAY) || 60000);

console.log('Reddit Bot Started!');
