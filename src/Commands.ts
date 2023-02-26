import {Command} from './types/Command';

export const Commands: Array<Command> = [
  {
    handler: 'txt',
    command: comment => {
      comment.reply('Sinerider TXT command called');
    },
  },
];
