import { Comment } from 'snoowrap';

export const replyWithoutGameplay = (
  comment: Comment,
  levelName: string,
  T: string,
  charCount: string,
  url: string
) => {
  comment
    .reply(
      `Hooray, Level Scored! Here is your stats: Level: ${levelName}, T: ${T}, CharCount: ${charCount}. Play it [here](${url})`
    )
    .catch(err => console.log(`Reply Error: ${err}`));
};

export const replyWithGameplay = (
  comment: Comment,
  levelName: string,
  T: string,
  charCount: string,
  url: string,
  gameplay: string
) => {
  comment
    .reply(
      `Hooray, Level Scored! Here is your stats: Level: ${levelName}, T: ${T}, CharCount: ${charCount}. Watch it [here](${gameplay}) or play it [here](${url})`
    )
    .catch(err => console.log(`Reply Error: ${err}`));
};
