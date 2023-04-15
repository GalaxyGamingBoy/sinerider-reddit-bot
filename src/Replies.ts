import { Comment } from 'snoowrap';
import { successResponse } from './Messages';

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
      successResponse(
        Math.floor(Math.random() * 4),
        levelName,
        T,
        charCount,
        gameplay
      )
    )
    .catch(err => console.log(`Reply Error: ${err}`));
};
