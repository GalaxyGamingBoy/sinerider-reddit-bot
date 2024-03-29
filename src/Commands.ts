/* eslint-disable eqeqeq */
/* eslint-disable prettier/prettier */
import {RegExpLib} from './RegExpLib';
import axios from 'axios';
import {replyWithGameplay} from './Replies';
import {airtableSetup} from './AirtableIntegration';
import https from 'node:https';
import Snoowrap from 'snoowrap';
import lzs from 'lz-string';
import {strings} from './Messages';
import {repliedComments, repliedCommentsIDs} from '.';
import metrics from './metrics';
// Check if the url is on the database
const isURLCached = (id: string, expression: string) => {
  return new Promise((resolve, reject) => {
    airtableSetup('Leaderboard')
      .select({
        filterByFormula: `AND(level='${id}', expression='${expression}')`,
        maxRecords: 1,
      })
      .eachPage(
        (records, fetchNextPage) => {
          if (records.length == 0) {
            resolve(false);
          } else {
            resolve(true);
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
  });
};

const replaceAll = (str: string, toReplace: string, replacedWith: string) => {
  while (str.includes(toReplace)) {
    str = str.replace(toReplace, replacedWith);
  }
  return str;
};

const removeMarkdownSpecial = (str: string) => {
  if (str) {
    str = replaceAll(str, '\\^', '^');
    str = replaceAll(str, '\\`', '`');
    str = replaceAll(str, '\\_', '_');
    str = replaceAll(str, '\\*', '*');
    str = replaceAll(str, '\\\\', '\\');
    str = replaceAll(str, '`', '');
    return str;
  } else {
    console.log(`String to parse: ${str}`);
  }
};

const updateCommentTries = (tries: number, commentID: string) => {
  airtableSetup('RedditCheckedID').update(repliedCommentsIDs.get(commentID), {
    tries: tries,
  });
};

const getCommentTries = (commentID: string): Promise<number> => {
  return new Promise(resolve => {
    airtableSetup('RedditCheckedID')
      .select({
        fields: ['tries'],
        filterByFormula: `{id}='${commentID}'`,
      })
      .firstPage()
      .then(records => {
        resolve(Number(records[0].get('tries')));
      });
  });
};

const completeComment = (commentID: string) => {
  console.log(commentID);
  console.log(repliedCommentsIDs.get(commentID));
  airtableSetup('RedditCheckedID').update(repliedCommentsIDs.get(commentID), {
    completed: true,
  });
};

const executeCommand = async (
  comment: Snoowrap.Comment,
  url: string,
  id: string,
  expression: string
) => {
  metrics.increment('command.execute.attempt', 1);
  console.log('FOUND COMMENT' + comment.permalink);
  const cached = await isURLCached(id, expression);

  // Send the level to the scoring server
  if (!cached) {
    updateCommentTries((await getCommentTries(comment.id)) + 1, comment.id);
    axios
      .post(
        `${process.env.S_SCORINGSERVER}/score`,
        {
          level: url,
        },
        {
          httpsAgent: new https.Agent({rejectUnauthorized: false}),
        }
      )
      .then(response => {
        if (response.data.time) {
          // If there is no gameplay, reply without it
          replyWithGameplay(
            comment,
            response.data.level,
            response.data.time,
            response.data.charCount,
            url,
            response.data.gameplay
          );

          // Upload Leaderboard data
          airtableSetup('Leaderboard').create({
            expression: expression,
            time: response.data.time,
            level: response.data.level,
            playURL: url,
            charCount: response.data.charCount,
            gameplay: response.data.gameplay,
            player: comment.author.name,
          });
          completeComment(comment.id);
          repliedComments.add(comment.id);
        } else {
          comment.reply(strings.timeOut[Math.floor(Math.random() * 4)]);
          airtableSetup('Leaderboard').create({
            expression: expression,
            level: response.data.level,
            playURL: url,
            charCount: response.data.charCount,
            gameplay: response.data.gameplay,
            player: comment.author.name,
          });
          completeComment(comment.id);
          repliedComments.add(comment.id);
        }
      })
      .catch(async e => {
        const tries = await getCommentTries(comment.id);
        if (tries < 3) {
          if (e.response.status == 429) {
            setTimeout(
              () => executeCommand(comment, url, id, expression),
              1000
            );
          } else {
            console.log(
              `Server Error! Retrying in: ${Math.pow(2, tries) * 1000}ms`
            );
            setTimeout(
              () => executeCommand(comment, url, id, expression),
              Math.pow(2, tries) * 1000
            );
          }
        } else {
          metrics.increment('command.execute.error', 1);
          comment.reply(
            'Oh no! An error occured with the Scoring Server Connection!  You will need to comment again to retry'
          );
          console.log(
            `Sinerider Scoring Server Error! For more diagnostics: ${e}`
          );
        }
      });
  } else {
    comment.reply(strings.duplicateHighScore[Math.floor(Math.random() * 4)]);
    completeComment(comment.id);
    repliedComments.add(comment.id);
  }
  console.log('REPLIED TO: ' + comment.permalink);
};

const getPuzzleByID = async (id: string) => {
  return new Promise(resolve => {
    airtableSetup('Puzzles')
      .select({
        filterByFormula: `id = '${id.replace('\\', '')}'`,
        maxRecords: 1,
      })
      .eachPage(
        (records, fetchNextPage) => {
          records.forEach(r => {
            resolve(r.get('puzzleURL'));
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
  });
};

const injectExpression = (domain, pData, expression) => {
  const explodedPuzzleData = JSON.parse(lzs.decompressFromBase64(pData));
  explodedPuzzleData.expressionOverride = expression;
  return (
    domain + '?' + lzs.compressToBase64(JSON.stringify(explodedPuzzleData))
  );
};

export const runCommand = async (comment: Snoowrap.Comment) => {
  const splittedComment = comment.body.split(' ');
  let puzzleID: string;
  let expression: string;

  splittedComment.forEach((val, index) => {
    // On Reddit when in the start of a line will add a \ to the # symbol
    if (val == '#sinerider' || val == '\\#sinerider') {
      puzzleID = removeMarkdownSpecial(splittedComment[index + 1]);
      expression = removeMarkdownSpecial(splittedComment[index + 2]);
    }
  });

  // Make sure both values are not undefined
  if (puzzleID && expression) {
    const puzzleURL: string = (await getPuzzleByID(puzzleID)) as string;
    const puzzleURLSplitted = puzzleURL.split('?');
    const domainPuzzleURL = puzzleURLSplitted[0];
    const puzzleData = puzzleURLSplitted[1];
    console.log(`Expression: ${expression}, Puzzle ID: ${puzzleID}`);
    executeCommand(
      comment,
      injectExpression(domainPuzzleURL, puzzleData, expression),
      puzzleID,
      expression
    );
  } else {
    console.log(
      `Comment did not match the format. Expression: ${expression}, Puzzle ID: ${puzzleID}`
    );
  }
};
