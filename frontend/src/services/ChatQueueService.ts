import { DeviceEventEmitter } from 'react-native';
import socketService from './socket';
import { ChatDBService } from './ChatDBService';

/**
 * Message Queue Item
 */
export interface QueuedMessage {
  client_message_id: string; // Used as unique requestId for WebSocket & idempotency
  server_id?: string | null;
  chat_id: string;
  sender_id: string;
  message: string;
  file?: string | null;
  file_type?: string | null;
  is_mine: number;
  is_deleted?: number;
  seen?: number;
  created_at: string;
  status: 'pending' | 'sending' | 'sent' | 'failed';
  extra_data?: string | null; // JSON containing { isGroup, receiver_id, my_profile_id, platform }
}

class ChatQueueService {
  private isProcessing = false;
  private pendingAcks: Map<string, { timeoutId: any; message: QueuedMessage; attempts: number }> = new Map();
  private readonly ACK_TIMEOUT_MS = 5000;
  private readonly MAX_ATTEMPTS = 5;

  private attemptCounts: Map<string, number> = new Map();

  constructor() {
    this.initListeners();
  }

  /**
   * Listen to WebSocket ACK and error events globally
   */
  private initListeners() {
    // 1. Listen via DeviceEventEmitter forwarded from socket.ts
    DeviceEventEmitter.addListener('chat:ack', (data: any) => {
      this.handleServerAck(data);
    });

    DeviceEventEmitter.addListener('chat:error', (data: any) => {
      this.handleServerError(data);
    });

    // 2. Also listen directly on the socket instance to prevent any DeviceEventEmitter dropping
    this.attachSocketDirectListeners();
  }

  public attachSocketDirectListeners() {
    const s = socketService.socket;
    if (s) {
      s.off('chat:ack', this.handleServerAckBound);
      s.off('chat:error', this.handleServerErrorBound);
      s.on('chat:ack', this.handleServerAckBound);
      s.on('chat:error', this.handleServerErrorBound);
    }
  }

  private handleServerAckBound = (data: any) => this.handleServerAck(data);
  private handleServerErrorBound = (data: any) => this.handleServerError(data);

  /**
   * Enqueue a new message in SQLite with 'pending' status, then immediately trigger processing.
   */
  public async enqueueMessage(params: {
    client_message_id: string;
    chat_id: string;
    sender_id: string;
    receiver_id: string | number;
    message: string;
    isGroup: boolean;
    my_profile_id: string | number;
    platform: string;
    created_at?: string;
  }): Promise<QueuedMessage> {
    const timestamp = params.created_at || new Date().toISOString();
    const extra = JSON.stringify({
      isGroup: params.isGroup,
      receiver_id: String(params.receiver_id),
      my_profile_id: String(params.my_profile_id),
      platform: params.platform,
    });

    const msgItem: QueuedMessage = {
      client_message_id: params.client_message_id,
      chat_id: params.chat_id,
      sender_id: String(params.sender_id),
      message: params.message || '',
      file: null,
      file_type: null,
      is_mine: 1,
      is_deleted: 0,
      seen: 0,
      created_at: timestamp,
      status: 'pending',
      extra_data: extra,
    };

    // 1. Save to SQLite with status = 'pending'
    await ChatDBService.saveMessages(params.chat_id, [{
      ...msgItem,
      status: 'pending',
      isOptimistic: true,
      extra_data: extra,
    }]);

    // 2. Notify local UI listeners immediately
    DeviceEventEmitter.emit('chat:local_message_status', {
      client_message_id: params.client_message_id,
      chat_id: params.chat_id,
      status: 'pending',
    });

    // 3. Trigger queue processor
    this.processQueue();

    return msgItem;
  }

  /**
   * Process all pending or failed messages from SQLite sequentially.
   * Called automatically on WebSocket connect, reconnect, or when a new message is enqueued.
   */
  public async processQueue(): Promise<void> {
    if (this.isProcessing) return;

    const socket = socketService.socket;
    if (!socket || !socket.connected) {
      console.log('[ChatQueue] Socket not connected. Queue paused.');
      return;
    }

    this.isProcessing = true;

    try {
      const pendingMessages = await ChatDBService.getPendingMessages();
      if (!pendingMessages || pendingMessages.length === 0) {
        this.isProcessing = false;
        return;
      }

      console.log(`[ChatQueue] Found ${pendingMessages.length} unsent messages in SQLite.`);

      for (const msg of pendingMessages) {
        // If socket disconnected while looping, stop
        if (!socketService.socket?.connected) {
          console.log('[ChatQueue] Socket disconnected during queue processing.');
          break;
        }

        // Skip if already waiting for ACK
        if (this.pendingAcks.has(msg.client_message_id)) {
          continue;
        }

        await this.sendMessageViaSocket(msg);
      }
    } catch (err) {
      console.error('[ChatQueue] Error processing queue:', err);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Sends an individual message payload over WebSocket with ACK timeout tracking
   */
  private async sendMessageViaSocket(msg: QueuedMessage): Promise<void> {
    const socket = socketService.socket;
    if (!socket || !socket.connected) return;

    let meta: any = {};
    try {
      if (msg.extra_data) {
        meta = JSON.parse(msg.extra_data);
      }
    } catch (e) {
      console.warn('[ChatQueue] Invalid extra_data in message', msg.client_message_id);
    }

    // 1. Update status to 'sending' in SQLite & UI
    await ChatDBService.updateMessageStatus(msg.client_message_id, { status: 'sending' });
    DeviceEventEmitter.emit('chat:local_message_status', {
      client_message_id: msg.client_message_id,
      chat_id: msg.chat_id,
      status: 'sending',
    });

    // 2. Setup ACK timeout timer (5 seconds)
    const currentAttempts = (this.attemptCounts.get(msg.client_message_id) || 0) + 1;
    this.attemptCounts.set(msg.client_message_id, currentAttempts);

    const timeoutId = setTimeout(() => {
      this.handleAckTimeout(msg.client_message_id);
    }, this.ACK_TIMEOUT_MS);

    this.pendingAcks.set(msg.client_message_id, {
      timeoutId,
      message: msg,
      attempts: currentAttempts,
    });

    // 3. Emit through WebSocket with requestId (client_message_id)
    const payload = {
      requestId: msg.client_message_id, // Explicit requestId as per requirement
      client_message_id: msg.client_message_id,
      isGroup: !!meta.isGroup,
      receiver_id: meta.receiver_id || msg.chat_id.replace(/^(user_|group_)/, ''),
      my_profile_id: meta.my_profile_id || msg.sender_id,
      message: msg.message,
      platform: meta.platform || 'community',
    };

    console.log(`[ChatQueue] Emitting chat:send for requestId ${msg.client_message_id} (attempt ${currentAttempts})`);
    socket.emit('chat:send', payload);
  }

  /**
   * Handle ACK received from server: mark message as 'sent'
   */
  public async handleServerAck(data: { requestId?: string; client_message_id?: string; server_id?: string; status?: string }) {
    const reqId = data.requestId || data.client_message_id;
    if (!reqId) return;

    console.log(`[ChatQueue] ACK received for requestId: ${reqId}`);

    this.attemptCounts.delete(reqId);
    const pending = this.pendingAcks.get(reqId);
    if (pending) {
      clearTimeout(pending.timeoutId);
      this.pendingAcks.delete(reqId);
    }

    const serverId = data.server_id || reqId;

    // 1. Update SQLite
    await ChatDBService.updateMessageStatus(reqId, {
      status: 'sent',
      server_id: serverId,
    });

    // 2. Broadcast to UI
    DeviceEventEmitter.emit('chat:local_message_status', {
      client_message_id: reqId,
      status: 'sent',
      server_id: serverId,
    });
  }

  /**
   * Handle server-side error
   */
  public async handleServerError(data: { requestId?: string; client_message_id?: string; message?: string }) {
    const reqId = data.requestId || data.client_message_id;
    if (!reqId) return;

    console.warn(`[ChatQueue] Server reported error for requestId ${reqId}: ${data.message}`);

    const pending = this.pendingAcks.get(reqId);
    if (pending) {
      clearTimeout(pending.timeoutId);
      this.pendingAcks.delete(reqId);
    }

    await ChatDBService.updateMessageStatus(reqId, { status: 'failed' });
    DeviceEventEmitter.emit('chat:local_message_status', {
      client_message_id: reqId,
      status: 'failed',
      error: data.message,
    });
  }

  /**
   * Handle ACK timeout (5 seconds passed without ACK)
   */
  private async handleAckTimeout(requestId: string) {
    const pending = this.pendingAcks.get(requestId);
    if (!pending) return;

    this.pendingAcks.delete(requestId);
    console.warn(`[ChatQueue] ACK timeout for requestId ${requestId} (attempt ${pending.attempts})`);

    // HTTP Fast Fallback: If WebSocket did not respond with ACK, send via HTTP directly!
    // Since backend has Idempotency Key, this will safely deliver or return the existing ID!
    try {
      let meta: any = {};
      if (pending.message.extra_data) {
        meta = JSON.parse(pending.message.extra_data);
      }
      const formData = new FormData();
      if (meta.isGroup) {
        formData.append('group_id', String(meta.receiver_id || pending.message.chat_id.replace(/^group_/, '')));
        formData.append('sender_id', String(meta.my_profile_id || pending.message.sender_id));
      } else {
        formData.append('my_profile_id', String(meta.my_profile_id || pending.message.sender_id));
        formData.append('receiver_id', String(meta.receiver_id || pending.message.chat_id.replace(/^user_/, '')));
      }
      formData.append('client_message_id', requestId);
      formData.append('message', pending.message.message || '');
      formData.append('platform', meta.platform || 'community');

      const endpoint = meta.isGroup ? 'send_group_message.php' : 'send_chat_message.php';
      const apiModule = await import('./api');
      const res = await apiModule.default.post(endpoint, formData);

      if (res.data && res.data.status === 'success') {
        const sId = res.data.id || res.data.client_message_id || requestId;
        this.handleServerAck({ requestId, client_message_id: requestId, server_id: sId, status: 'sent' });
        return;
      }
    } catch (httpErr: any) {
      console.warn('[ChatQueue] HTTP fallback failed:', httpErr.message);
    }

    if (pending.attempts >= this.MAX_ATTEMPTS) {
      // Mark as failed so user can manually retry or see failed indicator
      await ChatDBService.updateMessageStatus(requestId, { status: 'failed' });
      DeviceEventEmitter.emit('chat:local_message_status', {
        client_message_id: requestId,
        status: 'failed',
      });
    } else {
      // Revert status to pending in SQLite and schedule retry when connection permits
      await ChatDBService.updateMessageStatus(requestId, { status: 'pending' });
      DeviceEventEmitter.emit('chat:local_message_status', {
        client_message_id: requestId,
        status: 'pending',
      });

      // If socket is still connected, retry after short backoff
      setTimeout(() => {
        if (socketService.socket?.connected) {
          this.processQueue();
        }
      }, 3000);
    }
  }

  /**
   * Manually retry a failed message
   */
  public async retryMessage(clientMessageId: string) {
    this.attemptCounts.delete(clientMessageId);
    await ChatDBService.updateMessageStatus(clientMessageId, { status: 'pending' });
    DeviceEventEmitter.emit('chat:local_message_status', {
      client_message_id: clientMessageId,
      status: 'pending',
    });
    this.processQueue();
  }
}

export const chatQueueService = new ChatQueueService();
export default chatQueueService;
