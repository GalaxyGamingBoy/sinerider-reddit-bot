import {Command} from './types/Command';
import {RegExpLib} from './RegExpLib';
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
      const url = comment.body.split(' ')[1];
      console.log('REPLYING TO COMMENT: ' + comment.permalink);
      axios
        .post(
          process.env.S_SCORINGSERVER + '/score',
          {
            level: url,
          },
          {
            headers: {
              'User-Agent': 'redditbot',
            },
          }
        )
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
        });
    },
  },
];
