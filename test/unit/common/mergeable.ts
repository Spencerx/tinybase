import type {Stamp} from 'tinybase';
import {pause} from './other.ts';

const MASK6 = 63;
const SHIFT36 = 2 ** 36;
const SHIFT30 = 2 ** 30;
const SHIFT24 = 2 ** 24;
const SHIFT18 = 2 ** 18;
const SHIFT12 = 2 ** 12;
const SHIFT6 = 2 ** 6;

const toB64 = (num: number): string => String.fromCharCode(48 + (num & MASK6));

const encodeHlc = (
  logicalTime42: number,
  counter24: number,
  clientHash30: number,
): string =>
  toB64(logicalTime42 / SHIFT36) +
  toB64(logicalTime42 / SHIFT30) +
  toB64(logicalTime42 / SHIFT24) +
  toB64(logicalTime42 / SHIFT18) +
  toB64(logicalTime42 / SHIFT12) +
  toB64(logicalTime42 / SHIFT6) +
  toB64(logicalTime42) +
  toB64(counter24 / SHIFT18) +
  toB64(counter24 / SHIFT12) +
  toB64(counter24 / SHIFT6) +
  toB64(counter24) +
  toB64(clientHash30 / SHIFT24) +
  toB64(clientHash30 / SHIFT18) +
  toB64(clientHash30 / SHIFT12) +
  toB64(clientHash30 / SHIFT6) +
  toB64(clientHash30);

const STORE_ID_HASHES: {[id: string]: number} = {s1: 139573449, s2: 89240592};
const START_TIME = new Date('2024-01-01 00:00:00 UTC').valueOf();

export const getTimeFunctions = (): [
  reset: () => void,
  getNow: () => number,
  pause: (ms?: number) => Promise<void>,
] => {
  let time = 0;
  return [
    () => (time = START_TIME),
    () => time,
    async (ms = 50): Promise<void> => {
      time += ms;
      return pause(ms);
    },
  ];
};

export const time = (offset: number, counter: number, storeId: string = 's1') =>
  encodeHlc(START_TIME + offset, counter, STORE_ID_HASHES[storeId]);

export const stamped = (offset: number, counter: number, thing: any) => [
  thing,
  time(offset, counter, 's1'),
];

export const nullStamped = <Thing>(thing: Thing): Stamp<Thing> => [thing, ''];
