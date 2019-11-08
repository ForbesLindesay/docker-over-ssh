import {start} from './registry';
import {server, client} from './tcpStreamServer';
import {Readable, Writable, Duplex} from 'stream';
import {run} from '@databases/with-container';

const host =
  process.platform === 'darwin' ? 'host.docker.internal' : 'localhost';

export const detectPort: (
  defaultPort: number,
) => Promise<number> = require('detect-port');

export async function pull(
  container: string,
  inputStream: Readable,
  outputStream: Writable,
) {
  console.warn(`[docker-over-ssh pull] starting client`);
  const port = await detectPort(5200);
  const {stream, server} = client(port);
  console.warn(`[docker-over-ssh pull] started client at localhost:5200`);
  inputStream.pipe(stream).pipe(outputStream);
  console.warn(`[docker-over-ssh pull] pull`);
  await run('docker', ['pull', `${host}:${port}/${container}`], {
    debug: false,
    name: 'docker pull',
  });
  console.warn(`[docker-over-ssh pull] tag`);
  await run('docker', ['tag', `${host}:${port}/${container}`, container], {
    debug: false,
    name: 'docker tag',
  });
  console.warn(`[docker-over-ssh pull] cleanup tags`);
  await run('docker', ['rmi', `${host}:${port}/${container}`], {
    debug: false,
    name: 'docker rmi localhost...',
  });
  server.close();
  inputStream.unpipe(stream);
  stream.unpipe(outputStream);
}

export async function push(
  container: string,
  push: (stream: Duplex) => Promise<void>,
) {
  console.warn(`[docker-over-ssh push] Registry starting`);
  const {externalPort: port, kill} = await start();
  console.warn(`[docker-over-ssh push] Registry started at localhost:${port}`);
  try {
    try {
      console.warn(`[docker-over-ssh push] tag`);
      await run(
        'docker',
        ['tag', container, `localhost:${port}/${container}`],
        {
          debug: false,
          name: 'docker push',
        },
      );
      console.warn(`[docker-over-ssh push] push`);
      await run('docker', ['push', `localhost:${port}/${container}`], {
        debug: false,
        name: 'docker push',
      });
    } finally {
      console.warn(`[docker-over-ssh push] cleanup tags`);
      await run('docker', ['rmi', `localhost:${port}/${container}`], {
        debug: false,
        name: 'docker rmi localhost...',
      });
    }
    const s = server(port, 'localhost');
    await push(s);
  } finally {
    await kill();
  }
}

// async function s() {
//   await run('docker', ['images'], {debug: true, name: 'docker images'});
//   await push('node:12-alpine', async (stream) => {
//     await run('docker', ['images'], {debug: true, name: 'docker images'});
//     await run('docker', ['rmi', 'node:12-alpine'], {
//       debug: true,
//       name: 'docker images',
//     });
//     await pull('node:12-alpine', stream, stream);
//   });
//   await run('docker', ['images'], {debug: true, name: 'docker images'});
// }
// s().catch((ex) => {
//   console.error(ex);
//   process.exit(1);
// });
