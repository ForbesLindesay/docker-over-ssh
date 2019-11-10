# docker-over-ssh

Push docker containers efficiently over abitrary streams, e.g. ssh

## Installation

On both your local machine, and the remote machine you want to transfer an image to:

```
npm i -g docker-over-ssh
```

## Usage

To transfer an image called `node:12-alpine` to a server called `dokku` over `ssh`, run:

```
docker-over-ssh push node:12-alpine ssh dokku "docker-over-ssh pull node:12-alpine"
```

### Usage on CircleCI

For a working example, see: https://github.com/ForbesLindesay/web-app-template

To use on CircleCI, you will need to add the following to your yaml, in place of `- image: circleci/node:12` (or whatever base image you were using, as long as it has node it should be fine).

```yaml
- image: circleci/node:12
  environment:
    LOCAL_DOCKER_REGISTRY_PORT: '5000'
- image: registry:2
```

Sign up for an account at https://ngrok.com/ (don't worry, it's free, and really simple to setup).

Set your auth token to `DOCKER_REGISTRY_NGROK` in the CircleCI UI.

Finally, add `yarn install ngrok` or `npm install ngrok` to your CI before running the usual `docker-over-ssh push node:12-alpine ssh dokku "docker-over-ssh pull node:12-alpine"` command.

### Environment Variables

If you already have a local registry running, that you would like to use, you can specify the `LOCAL_DOCKER_REGISTRY_PORT` environment variable.

If your local registry is not running on the same machine as the `docker` daemon, you may need to use NGROK to connect the two. You can do this by signing up for a free account and setting the `DOCKER_REGISTRY_NGROK` env var to your NGROK auth key. If you do this, it will protect your docker registry with basic auth, to prevent anyone being able to interract with it. It's also only online briefly, which minimises the window for attack.

## How it works

The local CLI sets up a temporary docker registry (itself made using docker). It then pushes the requested image (and only the requested image) to that docker registry. It then spawns a child process, using the remaining params. In this example, that's `ssh dokku "docker-over-ssh pull node:12-alpine"`. It proxies connections over stdio <-> TCP between that child process and the temporary docker registry.

The remote CLI sets up a TCP server that proxies requests through to stdio (i.e. through to the local CLI's docker registry). It then runs `docker pull`, which pulls any missing layers over the ssh connection.

This is useful, because it can take advantage of the docker layer caching for much smaller transfers.
