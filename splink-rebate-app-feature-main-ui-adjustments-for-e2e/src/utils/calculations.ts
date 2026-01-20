export const calcPercentage = (part: number, total: number): number =>
  part > 0 && total > 0 ? Math.max(Math.round((part / total) * 100), 1) : 0;

export const randomNumber = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};
