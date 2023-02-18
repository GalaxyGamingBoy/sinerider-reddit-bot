import Snoowrap from 'snoowrap';

export type Command = {
  handler: string;
  command: (comment: Snoowrap.Comment) => void;
};
