import type { TransferHook, TransferStatus } from '@/types';

const calculatePercentage = (fileSize: number, bytesDownloaded: number) => {
  if (!fileSize || !bytesDownloaded) {
    return 0;
  }

  return bytesDownloaded / fileSize;
};

export const makeReadTransferStream = (
  response: Response,
  fileTransferHook: TransferHook
) => {
  const readStream = new ReadableStream({
    start(controller: ReadableStreamDefaultController<any>) {
      let bytesDownloaded: number = 0;

      const fileSize = Number(response?.headers?.get('content-length')) ?? 0;

      const reader = response.body.getReader();

      if (fileTransferHook) {
        const transferInitialState: TransferStatus = {
          bytesDownloaded: 0,
          fileSize,
          percentage: 0,
        };

        fileTransferHook(transferInitialState, new Uint8Array());
      }

      async function read() {
        const { done, value } = await reader.read();

        if (done) {
          controller.close();
          return;
        }

        if (fileTransferHook) {
          bytesDownloaded += value.byteLength;

          const percentage = calculatePercentage(fileSize, bytesDownloaded);

          const transferState: TransferStatus = {
            bytesDownloaded,
            fileSize,
            percentage,
          };

          fileTransferHook(transferState, value);
        }

        controller.enqueue(value);

        read();
      }

      read();
    },
  });

  return readStream;
};
