import { makeReadTransferStream } from './streams';

describe('Tests for streams', () => {
  describe('makeReadTransferStream', () => {
    let mockResponse: Response;
    let mockTransferHook: jest.Mock;

    beforeEach(() => {
      mockTransferHook = jest.fn();
      mockResponse = {
        body: {
          getReader: jest.fn().mockReturnValue({
            read: jest
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: new Uint8Array([1, 2, 3]),
              })
              .mockResolvedValueOnce({
                done: false,
                value: new Uint8Array([4, 5, 6]),
              })
              .mockResolvedValueOnce({ done: true, value: undefined }),
          }),
        },
        headers: new Headers({ 'content-length': '100' }),
      } as unknown as Response;
    });

    it('should call fileTransferHook with initial state', async () => {
      makeReadTransferStream(mockResponse, mockTransferHook);
      expect(mockTransferHook).toHaveBeenCalledWith(
        {
          bytesDownloaded: 0,
          fileSize: 100,
          percentage: 0,
        },
        new Uint8Array()
      );
    });

    it('should call fileTransferHook with updated state as data is read', async () => {
      const readStream = makeReadTransferStream(mockResponse, mockTransferHook);
      const reader = readStream.getReader();

      await reader.read();
      expect(mockTransferHook).toHaveBeenCalledWith(
        {
          bytesDownloaded: 3,
          fileSize: 100,
          percentage: 0.03,
        },
        new Uint8Array([1, 2, 3])
      );

      await reader.read();
      expect(mockTransferHook).toHaveBeenCalledWith(
        {
          bytesDownloaded: 6,
          fileSize: 100,
          percentage: 0.06,
        },
        new Uint8Array([4, 5, 6])
      );
    });

    it('should close the stream when done reading', async () => {
      const readStream = makeReadTransferStream(mockResponse, mockTransferHook);
      const reader = readStream.getReader();

      await reader.read();
      await reader.read();
      const result = await reader.read();

      expect(result.done).toBe(true);
    });
  });
});
