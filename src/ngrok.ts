import {URL} from 'url';
import generatePassCode, {Encoding} from '@authentication/generate-passcode';
// import {run} from '@databases/with-container';

export interface NGrokOptions {
  /**
   * http also supports https
   *
   * default: http
   */
  proto?: 'http' | 'tcp' | 'tls';
  /**
   * default: 80
   */
  addr?: number; // port or network address, defaults to 80
  /**
   * http basic authentication for tunnel
   *
   * format: user:pwd
   */
  auth?: string;
  /**
   * reserved tunnel name e.g. 'alex' =>  'https://alex.ngrok.io'
   */
  subdomain?: string;
  /**
   * your authtoken from ngrok.com
   */
  authtoken?: string;
  /**
   * one of ngrok regions (us, eu, au, ap)
   * default: us
   */
  region?: 'us' | 'eu' | 'au' | 'ap';
  /**
   * custom path for ngrok config file
   */
  configPath?: string;
  /**
   * custom binary path, eg for prod in electron
   */
  binPath?: (path: string) => string;
  /**
   * 'closed' - connection is lost, 'connected' - reconnected
   */
  onStatusChange?: (status: 'closed' | 'connected') => void;
  /**
   * returns stdout messages from ngrok process
   */
  onLogEvent?: (data: Buffer) => void;
}
export interface NGrok {
  authtoken(token: string): Promise<void>;
  connect(options: NGrokOptions): Promise<string>;
  disconnect(url?: string): Promise<void>;
  kill(): Promise<void>;
}

let ngrok: NGrok | null = null;
try {
  ngrok = require('ngrok');
} catch (ex) {
  // do nothing
}

let runningNGroks = 0;
export default async function getHost<T>(
  port: number,
  defaultHost: string,
  withHost: (host: string) => Promise<T>,
): Promise<T> {
  if (!process.env.DOCKER_REGISTRY_NGROK) {
    return await withHost(`${defaultHost}:${port}`);
  }
  if (!ngrok) {
    throw new Error(
      'You must install ngrok if you have set DOCKER_REGISTRY_NGROK',
    );
  }

  const auth =
    process.env.DOCKER_REGISTRY_NGROK === 'true'
      ? null
      : await Promise.all([
          generatePassCode(10, Encoding.base32),
          generatePassCode(60, Encoding.base32),
        ]).then(([user, pass]) => ({user, pass}));
  const options: NGrokOptions =
    process.env.DOCKER_REGISTRY_NGROK === 'true'
      ? {addr: port}
      : {
          addr: port,
          authtoken: process.env.DOCKER_REGISTRY_NGROK,
          auth: auth ? `${auth.user}:${auth.pass}` : undefined,
        };
  const urlString = await ngrok.connect(options);
  runningNGroks++;
  try {
    const url = new URL(urlString);
    if (auth) {
      // await run(
      //   'docker',
      //   ['login', '-u', auth.user, '-p', auth.pass, url.host],
      //   {
      //     debug: false,
      //     name: 'docker login',
      //   },
      // );
    }
    return await withHost(url.host);
  } finally {
    await ngrok.disconnect(urlString);
    setTimeout(async () => {
      runningNGroks--;
      if (runningNGroks === 0) {
        await ngrok!.kill();
      }
    }, 1000);
  }
}
