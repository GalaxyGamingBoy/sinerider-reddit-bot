/* eslint-disable prettier/prettier */
import { Command } from './types/Command';
import { RegExpLib } from './RegExpLib';
import axios from 'axios';
import { replyWithGameplay, replyWithoutGameplay } from './Replies';
import { airtableSetup } from './AirtableIntegration';
import https from 'node:https'

const markdownLinkExtractor = require('markdown-link-extractor');

export const Commands: Array<Command> = [
  {
    handler: RegExp('help'),
    command: comment => {
      console.log('REPLYING TO COMMENT: ' + comment.permalink);
      comment.reply('Sinerider HELP');
    },
  },
  {
    handler: RegExpLib.URL.regexp,
    command: (comment, cmd) => {
      let cached = false;
      comment.body.split(' ').forEach(str => {
        // Get link from comment markdown
        const { links } = markdownLinkExtractor(str);

        // If there is a link and it matches the URL regex
        if (links.length > 0 && links[0].match(RegExpLib.URL.regexp)) {
          // Get the link
          const url = links[0].match(RegExpLib.URL.regexp)[0];
          console.log('FOUND COMMENT' + comment.permalink);

          // Check if the url is on the database
          airtableSetup('Leaderboard').select({ filterByFormula: `playURL = '${url}'`, maxRecords: 1 }).eachPage(
            (records, fetchNextPage) => {
              records.forEach(record => {
                cached = true;
                comment.reply('Woops! Someone already submitted that solution to the leaderboards!')
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

          // Send the level to the scoring server
          if (!cached) {
            axios
              .post(`${process.env.S_SCORINGSERVER}/score`, {
                level: url,
              },
                {
                  httpsAgent: new https.Agent({ rejectUnauthorized: false })
                })
              .then(response => {
                // If there is no gameplay, reply without it
                if (response.data.gameplay === '') {
                  replyWithoutGameplay(comment, response.data.level, response.data.T, response.data.charCount, url)
                } else {
                  replyWithGameplay(comment, response.data.level, response.data.T, response.data.charCount, url, response.data.gameplay)
                }

                // Upload Leaderboard data
                airtableSetup('Leaderboard').create({
                  'expression': response.data.expression,
                  'time': response.data.T,
                  'level': response.data.level,
                  'playURL': url,
                  'charCount': response.data.charCount,
                  'gameplay': response.data.gameplay,
                  'player': comment.author.name
                });
              })
              .catch(e => {
                comment.reply(
                  'Oh no! An error occured with the Scoring Server Connection!  You will need to comment again to retry'
                );
                console.log(
                  `Sinerider Scoring Server Error! For more diagnostics: ${e}`
                );
              });
          }
          console.log('REPLIED TO: ' + comment.permalink);
        }
      })
    },
  },
];
