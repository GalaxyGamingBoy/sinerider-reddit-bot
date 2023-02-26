import {Command} from './types/Command';
import {RegExpLib} from './RegExpLib';

export const Commands: Array<Command> = [
  {
    handler: RegExp('help'),
    command: comment => {
      comment.reply('Sinerider HELP');
    },
  },
  {
    handler: RegExpLib.URL.regexp,
    command: comment => {
      comment.reply('URL DETECTED!');
    },
  },
];
