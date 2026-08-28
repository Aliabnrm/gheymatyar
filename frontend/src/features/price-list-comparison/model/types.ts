export interface ComparisonError {
  code: string;
  message: string;
}

export type ResultFilter =
  | "all"
  | "high-risk"
  | "price"
  | "added"
  | "removed"
  | "metadata"
  | "unchanged";
