import YAML from 'yaml';
import fs from 'fs';

export const strings = YAML.parse(
  fs.readFileSync('./res/messages.yaml', 'utf-8')
);

export const successResponse = (
  response: number,
  puzzleId: string,
  time: string,
  charCount: string,
  gameplay: string
) => {
  const str: string = strings.scoringSuccess[response];
  return str
    .replace('{puzzleId}', puzzleId)
    .replace('{time}', time)
    .replace('{charCount}', charCount)
    .replace('{gameplay}', `[View it here](${gameplay})`);
};
