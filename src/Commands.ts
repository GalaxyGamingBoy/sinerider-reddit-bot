/* eslint-disable prettier/prettier */
import { Command } from './types/Command';
import { RegExpLib } from './RegExpLib';
import axios from 'axios';

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
    command: comment => {
      comment.body.split(' ').forEach(s => {
        if (s.match(RegExpLib.URL.regexp)) {
          const url = s.match(RegExpLib.URL.regexp)[0];
          console.log('FOUND COMMENT' + comment.permalink);
          axios
            .post(`${process.env.S_SCORINGSERVER}/score`, {
              level: url,
            })
            .then(response => {
              if (response.data.success === true) {
                if (response.data.gameplay === '') {
                  comment.reply(
                    `Success! You did it! Here is your stats: Level: ${response.data.level}, T: ${response.data.T}, CharCount: ${response.data.charCount}. Play it [here](${url})`
                  );
                } else {
                  comment.reply(
                    `Success! You did it! Here is your stats: Level: ${response.data.level}, T: ${response.data.T}, CharCount: ${response.data.charCount}. Watch it [here](${response.data.gameplay}) or play it [here](${url})`
                  );
                }
              } else {
                comment.reply(
                  `Fail! :( You can try again! You go it. Review it [here](${url})`
                );
              }
            })
            .catch(e => {
              comment.reply(
                'Oh no! An error occured with the Scoring Server Connection!  You will need to comment again to retry'
              );
              console.log(
                `Sinerider Scoring Server Error! For more diagnostics: ${e}`
              );
            });
          console.log('REPLIED TO: ' + comment.permalink);
        }
      })
    },
  },
];
