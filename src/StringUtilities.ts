export default class StringUtilities {
  static formatString(
    string: string,
    params: [[key: string, value: string]]
  ): string {
    let newString = '';

    params.forEach(param =>
      string.split(' ').forEach(split => {
        if (split === '%' + param[0] + '%') {
          newString = newString.concat(param[1]);
        } else {
          newString = newString.concat(split);
        }
        newString = newString.concat(' ');
      })
    );
    return newString;
  }

  static checkRegex(string: string, regexExpression: RegExp): boolean {
    return regexExpression.test(string);
  }
}
