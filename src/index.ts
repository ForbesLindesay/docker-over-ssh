import {start} from './registry';
import {server, client} from './tcpStreamServer';
import {Readable, Writable, Duplex} from 'stream';
import {run} from '@databases/with-container';
import chalk from 'chalk';
import ngrok from './ngrok';
import {URL} from 'url';

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
  const {host, killNgrok} = await startNgrok(port);
  try {
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
  } finally {
    await killNgrok();
  }
}

async function startNgrok(port: number) {
  if (!process.env.DOCKER_REGISTRY_NGROK) {
    return {
      host: `${
        process.platform === 'darwin' ? 'host.docker.internal' : 'localhost'
      }:${port}`,
      killNgrok: async () => {
        // do nothing
      },
    };
  }
  if (!ngrok) {
    console.error(
      chalk.red(
        `[docker-over-ssh push] You must install ngrok using "yarn add ngrok" or "npm install ngrok" to use ngrok`,
      ),
    );
    return process.exit(1);
  }
  const url = await ngrok.connect({
    addr: port,
    authtoken:
      process.env.DOCKER_REGISTRY_NGROK === 'true'
        ? undefined
        : process.env.DOCKER_REGISTRY_NGROK,
  });
  const killNgrok = async () => await ngrok!.disconnect(url);
  const u = new URL(url);
  const host = u.host;
  return {host, killNgrok};
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
    const {host, killNgrok} = await startNgrok(port);

    try {
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
    } finally {
      if (killNgrok) await killNgrok();
    }

    const s = server(port, 'localhost');
    await push(s);
  } finally {
    if (killContainer) await killContainer();
  }
}
// docker pull dokku/letsencrypt:0.1.0 && docker pull gliderlabs/herokuish:latest && docker pull gliderlabs/herokuish:v0.5.0
