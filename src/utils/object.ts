export const isObject = (input: unknown): input is object =>
  input !== null && typeof input === 'object';

export const deepMerge = (...inputs: unknown[]): [] | object => {
  let output: [] | object = {};

  inputs.forEach((input) => {
    const isInputArray = Array.isArray(input);
    const isInputObject = isObject(input);

    if (isInputArray) {
      const outputToArray = Array.isArray(output) ? output : [];

      output = [...outputToArray, ...input];
    }

    if (isInputObject) {
      Object.keys(input).forEach((key) => {
        let value = input[key];

        const isExistingObject = isObject(value) && Reflect.has(output, key);

        if (isExistingObject) {
          const existingObject = output[key];
          value = deepMerge(existingObject, value);
        }

        output = {
          ...output,
          [key]: value,
        };
      });
    }
  });

  return output;
};
