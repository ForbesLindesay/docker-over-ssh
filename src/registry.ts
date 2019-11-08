import startContainer, {killOldContainers} from '@databases/with-container';

const CONTAINER_NAME = 'docker-over-ssh-registry';

interface Options {
  debug?: boolean;
  refreshImage?: boolean;
}
export async function start(options: Options = {}) {
  return await startContainer({
    debug: options.debug || false,
    refreshImage: options.refreshImage || false,
    image: 'registry:2',
    containerName: CONTAINER_NAME,
    defaultExternalPort: 5010,
    internalPort: 5000,
    connectTimeoutSeconds: 100,
    detached: true,
  });
}

export async function stop(options: Options = {}) {
  await killOldContainers({
    debug: options.debug || false,
    containerName: CONTAINER_NAME,
  });
}
// export async function killOldContainers(
//   options: Pick<NormalizedOptions, 'debug' | 'containerName'>,
// ) {
//   await run('docker', ['kill', options.containerName], {
//     allowFailure: true, // kill fails if there is no container running
//     debug: options.debug,
//     name: 'docker kill ' + JSON.stringify(options.containerName),
//   });
//   await run('docker', ['rm', options.containerName], {
//     allowFailure: true, // rm fails if there is no container running
//     debug: options.debug,
//     name: 'docker rm ' + JSON.stringify(options.containerName),
//   });
// }

// export default async function startContainer(options: Options) {
