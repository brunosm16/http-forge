export const isTimeStamp = (value: unknown) => {
  if (typeof value !== 'string') {
    return false;
  }

  const time = new Date(value)?.getTime();

  return time > 0;
};
