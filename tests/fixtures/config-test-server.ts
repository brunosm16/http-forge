import * as createTestServer from 'create-test-server';
import * as fs from 'fs';

export const configTestServer = async () => {
  const server = await createTestServer();

  server.get('/', (req, res) => {
    if (req.query.page === '/http://mock-query-page/') {
      res.end('mock-query-page response');
      return;
    }

    res.end('Root endpoint');
  });

  server.get('/success', (req, res) => {
    res.end('Hey this is a successful GET response');
  });

  server.delete('/success', (req, res) => {
    res.end('Hey this is a successful DELETE response');
  });

  server.head('/success', (req, res) => {
    res.end('');
  });

  server.patch('/success', (req, res) => {
    res.end('Hey this is a successful PATCH response');
  });

  server.post('/success', (req, res) => {
    res.end('Hey this is a successful POST response');
  });

  server.put('/success', (req, res) => {
    res.end('Hey this is a successful PUT response');
  });

  server.post('/json-test', (req, res) => {
    res.json(JSON.parse(req.body));
  });

  server.get('/empty-response', (req, res) => {
    res.status(200).end('');
  });

  server.get('/no-content', (req, res) => {
    res.status(204).end('');
  });

  server.get('/headers-test', (req, res) => {
    const { headers } = req;

    const customHeader = headers['x-custom-header'];

    res.end(customHeader);
  });

  server.get('/error', (req, res) => {
    res.sendStatus(401);
  });

  server.get('/api/users', (req, res) => {
    res.end('Mock users response');
  });

  server.get('/search-params-test', (req, res) => {
    const urlLength = req?.url?.length;
    const searchParamChar = req?.url?.indexOf('?');

    if (searchParamChar === -1) {
      res.end(req.url);
    }

    const searchParam = req.url.slice(searchParamChar, urlLength);
    res.end(searchParam);
  });

  server.get('/file-transfer', (req, res) => {
    const fileDir = `${__dirname}/sample-data.csv`;
    const fileSize = fs.statSync(fileDir)?.size;
    const readStream = fs.createReadStream(fileDir);

    res.writeHead(200, {
      'Content-Length': fileSize,
    });

    readStream.pipe(res);
  });

  server.get('/file-transfer-no-size', (req, res) => {
    const fileDir = `${__dirname}/sample-data.csv`;
    const readStream = fs.createReadStream(fileDir);

    readStream.pipe(res);
  });

  return server;
};
