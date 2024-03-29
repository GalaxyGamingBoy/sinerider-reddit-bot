export const RegExpLib = {
  URL: {
    id: 'url',
    regexp: RegExp(
      /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\\+.~#?&\\\/=]*)$/
    ),
  },
  EXPRESSION: {
    id: 'expression',
    regexp: RegExp(/^([\w\\^*+\\/\-()]+)/),
  },
};
