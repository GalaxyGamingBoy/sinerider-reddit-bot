import Airtable from 'airtable';

export const airtableSetup = (base: string) => {
  // eslint-disable-next-line prettier/prettier
  return new Airtable({ apiKey: process.env.SINERIDER_AIRTABLE_API_KEY }).base(process.env.SINERIDER_AIRTABLE_BASE)(base);
};
