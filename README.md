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

## How it works

The local CLI sets up a temporary docker registry (itself made using docker). It then pushes the requested image (and only the requested image) to that docker registry. It then spawns a child process, using the remaining params. In this example, that's `ssh dokku "docker-over-ssh pull node:12-alpine"`. It proxies connections over stdio <-> TCP between that child process and the temporary docker registry.

The remote CLI sets up a TCP server that proxies requests through to stdio (i.e. through to the local CLI's docker registry). It then runs `docker pull`, which pulls any missing layers over the ssh connection.

This is useful, because it can take advantage of the docker layer caching for much smaller transfers.
