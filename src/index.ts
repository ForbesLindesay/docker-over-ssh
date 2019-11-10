import {start} from './registry';
import {server, client} from './tcpStreamServer';
import {Readable, Writable, Duplex} from 'stream';
import {run} from '@databases/with-container';
import chalk from 'chalk';
import getHost from './ngrok';

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
  inputStream.pipe(stream).pipe(outputStream);
  await getHost(
    port,
    process.platform === 'darwin' ? 'host.docker.internal' : 'localhost',
    async (host) => {
      console.warn(`[docker-over-ssh pull] started client at ${host}`);
      console.warn(`[docker-over-ssh pull] pull ${host}/${container}`);
      await run('docker', ['pull', `${host}/${container}`], {
        debug: false,
        name: 'docker pull',
      });
      console.warn(
        `[docker-over-ssh pull] tag ${host}/${container} ${container}`,
      );
      await run('docker', ['tag', `${host}/${container}`, container], {
        debug: false,
        name: 'docker tag',
      });
      console.warn(`[docker-over-ssh pull] cleanup tags`);
      await run('docker', ['rmi', `${host}/${container}`], {
        debug: false,
        name: 'docker rmi localhost...',
      });
      server.close();
      inputStream.unpipe(stream);
      stream.unpipe(outputStream);
    },
  );
}

export async function push(
  container: string,
  push: (stream: Duplex) => Promise<void>,
) {
  let port = process.env.LOCAL_DOCKER_REGISTRY_PORT
    ? parseInt(process.env.LOCAL_DOCKER_REGISTRY_PORT, 10)
    : null;
  let killContainer;
  console.warn(`[docker-over-ssh push] Registry starting`);
  if (!port) {
    const {externalPort, kill} = await start();
    port = externalPort;
    killContainer = kill;
  }

  try {
    await getHost(port, 'localhost', async (host) => {
      console.warn(`[docker-over-ssh push] Registry started at ${host}`);
      let pushed = false;
      try {
        console.warn(`[docker-over-ssh push] tag`);
        await run('docker', ['tag', container, `${host}/${container}`], {
          debug: false,
          name: 'docker push',
        });
        console.warn(`[docker-over-ssh push] push`);
        await run('docker', ['push', `${host}/${container}`], {
          debug: true,
          name: 'docker push',
        });
        pushed = true;
      } finally {
        if (!pushed) {
          console.warn(
            chalk.red(`[docker-over-ssh push] failed to push docker container`),
          );
        }
        console.warn(`[docker-over-ssh push] cleanup tags`);
        await run('docker', ['rmi', `${host}/${container}`], {
          debug: false,
          name: 'docker rmi localhost...',
        });
      }
    });

    const s = server(port, 'localhost');
    await push(s);
  } finally {
    if (killContainer) await killContainer();
  }
}
// docker pull dokku/letsencrypt:0.1.0 && docker pull gliderlabs/herokuish:latest && docker pull gliderlabs/herokuish:v0.5.0
