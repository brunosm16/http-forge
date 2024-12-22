import httpForge from '@/main';

describe('httpForge', () => {
  it('Should have a httpForge instance defined', () => {
    expect(httpForge.get).toBeDefined();
    expect(httpForge).toEqual(
      expect.objectContaining({
        delete: expect.any(Function),
        get: expect.any(Function),
        head: expect.any(Function),
        patch: expect.any(Function),
        post: expect.any(Function),
        put: expect.any(Function),
      })
    );
  });
});
