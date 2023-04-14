export const Messages = {
  duplicateHighScore:
    "Sorry, someone's already submitted that solution to the leaderboards — try again with a different answer!",
  timeOut:
    'Sorry, that submission takes longer than 30 seconds to evaluate, so we had to disqualify it. :( Try again with a new solution!',
  response: (
    response: number,
    id: string,
    time: string,
    charCount: string,
    gameplay: string
  ) => {
    switch (response) {
      case 1:
        return `Woohoo!! You're on the leaderboard for ${id} with a time of ${time} (vroom vroom!) and a character count of ${charCount}! Check out this super cool video of your run: [here](${gameplay})!`;
      case 2:
        return `🥳🥳🥳 You're on the ${id} leaderboard with a super speedy time of ${time} and a character count of ${charCount}! We even made this groovy video of your run: [here](${gameplay})!`;
      case 3:
        return `Cowabunga! You've made it onto the ${id} leaderboard! You got an unbelievably fast time of ${time} (WOW!) and a character count of ${charCount}! There's even a super cool video of your run: [here](${gameplay})!`;
      default:
        return `"Grooooovy! You're on the leaderboard for ${id} with a time of ${time} (speedy!!) and a character count of ${charCount}! Also, we made you an *awesome* video of your run: [here](${gameplay})`;
    }
  },
};
