#!/usr/bin/env node

import {spawn} from 'child_process';
import {pull, push} from './';
import progress from 'progress-stream';
import logUpdate from 'log-update';
import bytes from 'bytes';

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
}
