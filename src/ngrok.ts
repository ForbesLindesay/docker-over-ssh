export interface NGrok {
  authtoken(token: string): Promise<void>;
  connect(options: {
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
  }): Promise<string>;
  disconnect(url?: string): Promise<void>;
  kill(): Promise<void>;
}

let ngrok: NGrok | null = null;
try {
  ngrok = require('ngrok');
} catch (ex) {
  // do nothing
}

export default ngrok;
