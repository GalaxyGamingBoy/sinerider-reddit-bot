/* eslint-disable eqeqeq */
import * as dotenv from 'dotenv';
import Snoowrap from 'snoowrap';
// eslint-disable-next-line prettier/prettier
import { runCommand } from './Commands';
import passport from 'passport';
// eslint-disable-next-line prettier/prettier
import { BasicStrategy } from 'passport-http';
import express from 'express';
import CORS from 'cors';
import bodyParser from 'body-parser';
// eslint-disable-next-line prettier/prettier
import { airtableSetup } from './AirtableIntegration';
// eslint-disable-next-line prettier/prettier
import lzs from "lz-string"

dotenv.config();

const r = new Snoowrap({
  userAgent: process.env.R_USERAGENT || '',
  clientId: process.env.R_CLIENTID || '',
  password: process.env.R_PASSWORD || '',
  username: process.env.R_USERNAME || '',
  clientSecret: process.env.R_SECRET || '',
});

// eslint-disable-next-line prefer-const
let repliedComments: Set<String> = new Set();

const getRepliedCommentIDs = () => {
  return new Promise((resolve, reject) => {
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
          resolve('Done');
        },
        err => {
          if (err) {
            console.log(err);
            return;
          }
        }
      );
  });
};

const listenForCommands = async () => {
  // Get the new comments in the specified subreddit
  r.getSubreddit(process.env.B_SUBREDDIT || '')
    .getNewComments()
    .then(newComments => {
      // Get All Valid Comments
      newComments.forEach(comment => {
        // If the command body includes a handler then push it to `newValidComments`
        if (
          comment.body.indexOf('#sinerider') !== -1 &&
          !repliedComments.has(comment.id)
        ) {
          // eslint-disable-next-line prettier/prettier
          airtableSetup('RedditCheckedID').create({ id: comment.id });
          repliedComments.add(comment.id);
          runCommand(comment);
        }
      });
    })
    .catch(e => {
      console.log(
        'Connection failed... Is reddit down? Further analysis: ' + e.stack
      );
    });
};

const addNewDailyLevel = (
  title: string,
  desc: string,
  url: string,
  puzzleID: string
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
      title: title,
      text: `${desc}  [Play it here](${url})`,
      subredditName: process.env.B_SUBREDDIT || '',
    })
    .then(post => {
      post.sticky();

      // Upload the Post ID
      airtableSetup('Config').create(
        {
          config_name: `reddit_postid_${puzzleID}`,
          value: post.id.toString(),
        },
        err => {
          if (err) {
            console.log(err);
            return;
          }
        }
      );
    });
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
  '/publishLevel',
  // eslint-disable-next-line prettier/prettier
  passport.authenticate('basic', { session: false }),
  (req, res) => {
    // Verify that there is publishing info
    if (req.query.publishingInfo) {
      const publishingInfo = JSON.parse(
        lzs.decompressFromBase64(req.query.publishingInfo.toString())
      );

      // Verify that the publishing info is valid
      if (
        publishingInfo.puzzleTitle &&
        publishingInfo.puzzleDescription &&
        publishingInfo.puzzleURL &&
        publishingInfo.id
      ) {
        addNewDailyLevel(
          publishingInfo.puzzleTitle,
          publishingInfo.puzzleDescription,
          publishingInfo.puzzleURL,
          publishingInfo.id
        );
      }
    }
    res.status(200).end('OK!');
  }
);

const pollReddit = async () => {
  await getRepliedCommentIDs();
  setInterval(() => {
    console.log('Checking for new comments...');
    listenForCommands();
  }, Number(process.env.B_CHECKDELAY) || 60000);
  console.log('Reddit Bot Started!');
};

const webServer = () => {
  app.listen(process.env.PORT || 3000, () => {
    console.log(`Doing magic in port ${process.env.PORT || 3000}, Have fun!`);
  });
};

// Define Runtime
if (!process.env.PROC_TYPE) {
  console.log('No PROC_TYPE Defined! Probably Running Locally');
  webServer();
  pollReddit();
} else if (process.env.PROC_TYPE === 'web') {
  console.log('PROC_TYPE is web, Starting Web Server');
  webServer();
} else if (process.env.PROC_TYPE === 'worker') {
  console.log('PROC_TYPE is worker, Starting Worker');
  pollReddit();
} else {
  console.log('PROC_TYPE is invalid, Halting...');
}
