#!/usr/bin/env node

import {spawn} from 'child_process';
import {pull, push} from './';
import progress from 'progress-stream';
import logUpdate from 'log-update';
import bytes from 'bytes';

if (process.argv.includes('--help')) {
  help();
  process.exit(0);
}
if (!process.argv[3]) {
  help();
  process.exit(1);
}
switch (process.argv[2]) {
  case 'pull':
    pull(process.argv[3], process.stdin, process.stdout).then(
      () => {
        process.exit(0);
      },
      (ex) => {
        console.error(ex);
        process.exit(1);
      },
    );
    break;
  case 'push':
    if (!process.argv[4]) {
      help();
      process.exit(1);
    }
    const child = process.argv.slice(4);
    push(process.argv[3], async (stream) => {
      const prog = progress({time: 100}, (e) => {
        logUpdate(`${bytes(e.transferred)} at ${bytes(e.speed)}/Sec`);
      });
      const proc = spawn(child[0], child.slice(1), {
        stdio: ['pipe', 'pipe', 'inherit'],
      });
      stream.pipe(prog).pipe(proc.stdin);
      proc.stdout.pipe(stream);
      const code = await new Promise<number>((resolve, reject) => {
        proc.on('exit', resolve);
        proc.on('error', reject);
      });
      if (code !== 0) {
        throw new Error('Destination exited with non-zero code');
      }
    }).catch((ex) => {
      console.error(ex);
      process.exit(1);
    });
    break;
  default:
    help();
    process.exit(1);
    break;
}

function help() {
  console.info(
    'To transfer an image called `node:12-alpine` to a server called `dokku` over `ssh`, run:',
  );
  console.info();
  console.info(
    '  docker-over-ssh push node:12-alpine ssh dokku "docker-over-ssh pull node:12-alpine"',
  );
  console.info();
}
