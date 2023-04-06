import Snoowrap from 'snoowrap';

export type Command = {
  handler: RegExp;
  command: (comment: Snoowrap.Comment, cmd: any) => void;
};
