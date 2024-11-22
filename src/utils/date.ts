export const isTimeStamp = (value: unknown) => {
  const parsedValue = Number(value);

  if (typeof value !== 'string' || !Number.isNaN(parsedValue)) {
    return false;
  }

  const time = new Date(value)?.getTime();

  return time > 0;
};
