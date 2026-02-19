export interface Account {
  acct: string;
  domain: string;
  description: string;
}

export interface AccountApiResponse {
  accounts: Account[];
}