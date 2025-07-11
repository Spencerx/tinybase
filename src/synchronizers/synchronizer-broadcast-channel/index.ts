import type {IdOrNull} from '../../@types/common/index.d.ts';
import type {MergeableStore} from '../../@types/mergeable-store/index.d.ts';
import type {
  Message,
  Receive,
  Send,
} from '../../@types/synchronizers/index.d.ts';
import type {createBroadcastChannelSynchronizer as createBroadcastChannelSynchronizerDecl} from '../../@types/synchronizers/synchronizer-broadcast-channel/index.d.ts';
import {getUniqueId} from '../../common/codec.ts';
import {isUndefined} from '../../common/other.ts';
import {createCustomSynchronizer} from '../index.ts';

export const createBroadcastChannelSynchronizer = ((
  store: MergeableStore,
  channelName: string,
  onSend?: Send,
  onReceive?: Receive,
  onIgnoredError?: (error: any) => void,
) => {
  const clientId = getUniqueId();
  const channel = new BroadcastChannel(channelName);

  const send = (
    toClientId: IdOrNull,
    requestId: IdOrNull,
    message: Message,
    body: any,
  ): void =>
    channel.postMessage([clientId, toClientId, requestId, message, body]);

  const registerReceive = (receive: Receive): void => {
    channel.onmessage = ({
      data: [fromClientId, toClientId, requestId, message, body],
    }) =>
      isUndefined(toClientId) || toClientId == clientId
        ? receive(fromClientId, requestId, message, body)
        : 0;
  };

  const destroy = (): void => {
    channel.close();
  };

  return createCustomSynchronizer(
    store,
    send,
    registerReceive,
    destroy,
    0.01,
    onSend,
    onReceive,
    onIgnoredError,
    {getChannelName: () => channelName},
  );
}) as typeof createBroadcastChannelSynchronizerDecl;
