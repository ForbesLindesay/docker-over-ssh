import {Duplex} from 'stream';

export type OnStream = (stream: Duplex) => void;
export type MultiPlex = (
  onStream?: OnStream,
) => Duplex & {createStream: () => Duplex};

const multiplex: MultiPlex = require('multiplex');
export default multiplex;
