import {createServer, createConnection} from 'net';
import createMultiplex from './multiplex';

export function server(port: number, host?: string | undefined) {
  const multiplex = createMultiplex((stream) => {
    const connection = createConnection(port, host);
    stream.pipe(connection).pipe(stream);
  });
  return multiplex;
}

export function client(port: number) {
  const multiplex = createMultiplex();
  const server = createServer((stream) => {
    const dest = multiplex.createStream();
    dest.pipe(stream).pipe(dest);
    dest.on('error', (e) => stream.emit('error', e));
  }).listen(port);
  return {stream: multiplex, server};
}
