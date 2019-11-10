import {push, pull} from '..';
import {run} from '@databases/with-container';

jest.setTimeout(60_000);

async function has(image: string) {
  const result = await run('docker', ['images', '--format', '{{json .}}'], {
    debug: false,
    name: 'docker images',
  });
  return result.stdout
    .toString('utf8')
    .split('\n')
    .filter(Boolean)
    .map((v) => JSON.parse(v))
    .some((v) => `${v.Repository}:${v.Tag}` === image);
}

test('push', async () => {
  await run('docker', ['pull', 'node:12-alpine'], {
    debug: true,
    name: 'docker pull node:12-alpine',
  });
  expect(await has('node:12-alpine')).toBe(true);
  await push('node:12-alpine', async (stream) => {
    await run('docker', ['rmi', 'node:12-alpine'], {
      debug: true,
      name: 'docker rmi node:12-alpine',
    });
    expect(await has('node:12-alpine')).toBe(false);
    await pull('node:12-alpine', stream, stream);
  });
  expect(await has('node:12-alpine')).toBe(true);
});
