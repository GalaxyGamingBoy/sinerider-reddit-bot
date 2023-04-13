/* eslint-disable eqeqeq */
/* eslint-disable prettier/prettier */
import { RegExpLib } from './RegExpLib';
import axios from 'axios';
import { replyWithGameplay, replyWithoutGameplay } from './Replies';
import { airtableSetup } from './AirtableIntegration';
import https from 'node:https'
import Snoowrap from 'snoowrap';
import lzs from 'lz-string';

const executeCommand = (comment: Snoowrap.Comment, url: string) => {
  console.log('FOUND COMMENT' + comment.permalink);
  let cached = true;

  // Check if the url is on the database
  airtableSetup('Leaderboard').select({ filterByFormula: `playURL = '${url}'`, maxRecords: 1 }).eachPage(
    (records, fetchNextPage) => {
      if (records.length > 0) {
        comment.reply('Woops! Someone already submitted that solution to the leaderboards!')
      } else {
        cached = false
      }
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

const getPuzzleByID = (id: string) => {
  let puzzle;
  airtableSetup('Puzzles').select({ filterByFormula: `id = '${id}'`, maxRecords: 1 }).eachPage(
    (records, fetchNextPage) => {
      puzzle = records[0]
      fetchNextPage();
    },
    err => {
      if (err) {
        console.log(err);
        return;
      }
    }
  );
  return puzzle;
}

const injectExpression = (domain, pData, expression) => {
  const explodedPuzzleData = JSON.parse(lzs.decompressFromBase64(pData));
  explodedPuzzleData.expressionOverride = expression;
  return (
    domain + "?" + lzs.compressToBase64(JSON.stringify(explodedPuzzleData))
  );
};

export const runCommand = (comment: Snoowrap.Comment) => {
  const splittedComment = comment.body.split(' ')
  let puzzleID: string
  let expression: string

  splittedComment.forEach((val, index) => {
    // On Reddit when in the start of a line will add a \ to the # symbol
    if (val == '#sinerider' || val == '\\#sinerider') {
      puzzleID = splittedComment[index + 1]
      expression = splittedComment[index + 2]
    }
  })

  // Make sure both values are not undefined
  if (puzzleID && expression) {
    const puzzleURL = getPuzzleByID(puzzleID).get('puzzleURL')
    const puzzleURLSplitted = puzzleURL.split("?");
    const domainPuzzleURL = puzzleURLSplitted[0];
    const puzzleData = puzzleURLSplitted[1];

    executeCommand(comment, injectExpression(domainPuzzleURL, puzzleData, expression))
  }
}
