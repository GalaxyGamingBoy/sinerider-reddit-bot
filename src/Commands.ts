/* eslint-disable eqeqeq */
/* eslint-disable prettier/prettier */
import { RegExpLib } from './RegExpLib';
import axios from 'axios';
import { replyWithGameplay, replyWithoutGameplay } from './Replies';
import { airtableSetup } from './AirtableIntegration';
import https from 'node:https'
import Snoowrap from 'snoowrap';
import lzs from 'lz-string';

// Check if the url is on the database
const isURLCached = (id: string, expression: string) => {
  return new Promise((resolve, reject) => {
    airtableSetup('Leaderboard').select({ filterByFormula: `AND(level='${id}', expression='${expression}')`, maxRecords: 1 }).eachPage(
      (records, fetchNextPage) => {
        if (records.length == 0) {
          resolve(false)
        } else {
          resolve(true)
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
  })
}

const executeCommand = async (comment: Snoowrap.Comment, url: string, id: string, expression: string) => {
  console.log('FOUND COMMENT' + comment.permalink);
  const cached = await isURLCached(id, expression);
  // Send the level to the scoring server
  console.log(cached)
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
  } else {
    comment.reply('Woops! Someone already submitted that solution to the leaderboards!')
  }
  console.log('REPLIED TO: ' + comment.permalink);
}

const getPuzzleByID = async (id: string) => {
  return new Promise((resolve, reject) => {
    airtableSetup('Puzzles').select({ filterByFormula: `id = '${id.replace('\\', '')}'`, maxRecords: 1 }).eachPage(
      (records, fetchNextPage) => {
        records.forEach(r => {
          resolve(r.get('puzzleURL'))
        })
        fetchNextPage();
      },
      err => {
        if (err) {
          console.log(err);
          return;
        }
      }
    );
  })
}

const injectExpression = (domain, pData, expression) => {
  const explodedPuzzleData = JSON.parse(lzs.decompressFromBase64(pData));
  explodedPuzzleData.expressionOverride = expression;
  return (
    domain + "?" + lzs.compressToBase64(JSON.stringify(explodedPuzzleData))
  );
};

export const runCommand = async (comment: Snoowrap.Comment) => {
  const splittedComment = comment.body.split(' ')
  let puzzleID: string
  let expression: string

  splittedComment.forEach((val, index) => {
    // On Reddit when in the start of a line will add a \ to the # symbol
    if (val == '#sinerider' || val == '\\#sinerider') {
      puzzleID = splittedComment[index + 1] || ''
      expression = splittedComment[index + 2].replace('\\', '') || ''
    }
  })

  // Make sure both values are not undefined
  if (puzzleID && expression) {
    const puzzleURL: string = await getPuzzleByID(puzzleID) as string
    const puzzleURLSplitted = puzzleURL.split('?');
    const domainPuzzleURL = puzzleURLSplitted[0];
    const puzzleData = puzzleURLSplitted[1];
    executeCommand(comment, injectExpression(domainPuzzleURL, puzzleData, expression), puzzleID, expression)
  }
}
