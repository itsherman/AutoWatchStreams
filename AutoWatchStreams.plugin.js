/**
 * @name AutoWatchStreams
 * @version 1.0.0
 * @author YOURNAME
 * @description Automatically watches every screen share in your voice channel. Adds each new stream to the multistream grid instead of replacing what you are already watching.
 * @source https://github.com/YOURNAME/AutoWatchStreams
 * @updateUrl https://raw.githubusercontent.com/YOURNAME/AutoWatchStreams/main/AutoWatchStreams.plugin.js
 */

/*
 * How this works
 * --------------
 * Discord's watch thunk takes (streamDescriptor, options). Passing
 * { forceMultiple: true } adds the stream to the existing watch set; omitting
 * it makes Discord REPLACE the set, tearing down an open multistream grid.
 * { noFocus: true } stops the new stream from stealing focus.
 *
 * selectParticipant() afterwards forces the media engine to start decoding the
 * stream, which is what actually puts a picture in the tile.
 *
 * Stream keys are "guild:<guildId>:<channelId>:<userId>" or
 * "call:<channelId>:<userId>".
 *
 * Mechanism credit: relyTzzz/DiscordPlugin (StreamWindows), GPL-3.0.
 */

/** ms to wait after STREAM_CREATE so the store has the stream descriptor */
const CREATE_SETTLE_MS = 300;
/** ms to wait after connecting to voice so the channel's stream list is populated */
const JOIN_SETTLE_MS = 1500;

module.exports = class AutoWatchStreams {

    // --- pure helpers (static so test.js can exercise them under plain node) ---

    /** Build the stream key Discord uses to address a stream. */
    static streamKeyOf(stream) {
        return stream.streamType === "call"
            ? `call:${stream.channelId}:${stream.ownerId}`
            : `guild:${stream.guildId}:${stream.channelId}:${stream.ownerId}`;
    }

    /** Pull the owning user id out of a stream key. Works for both key shapes. */
    static ownerOf(streamKey) {
        return String(streamKey).split(":").pop();
    }

    // --- lifecycle ---

    start() {
        const W = BdApi.Webpack;

        this.dispatcher = W.getByKeys("dispatch", "subscribe");
        this.streamStore = W.getStore("ApplicationStreamingStore");
        this.channelStore = W.getByKeys("getVoiceChannelId", "getChannelId");
        this.participant = W.getByKeys("selectParticipant");
        this.userStore = W.getStore("UserStore");

        // Bare function export, so searchExports is required to reach it.
        this.watchThunk = W.getModule(W.Filters.byStrings("STREAM_WATCH", "streamKey"), { searchExports: true });

        // Discord renames internals on most updates. Fail loudly rather than
        // sitting there silently doing nothing.
        const missing = Object.entries({
            dispatcher: this.dispatcher,
            ApplicationStreamingStore: this.streamStore,
            channelStore: this.channelStore,
            UserStore: this.userStore,
        }).filter(([, mod]) => !mod).map(([name]) => name);

        if (missing.length) {
            BdApi.UI.showToast(`AutoWatchStreams: Discord internals moved (${missing.join(", ")}). Plugin needs updating.`, { type: "error" });
            return;
        }

        this.me = this.userStore.getCurrentUser()?.id;
        this.running = true;
        this.lastChannel = null;

        this.onStreamCreate = ({ streamKey }) => {
            const userId = AutoWatchStreams.ownerOf(streamKey);
            if (!userId || userId === this.me) return;
            setTimeout(() => this.watchUser(userId), CREATE_SETTLE_MS);
        };

        // Catches streams that were already running when you joined the channel.
        this.onRtcState = ({ state, channelId }) => {
            if (state !== "RTC_CONNECTED") return;
            const id = channelId ?? this.currentChannel();
            if (!id || id === this.lastChannel) return;
            this.lastChannel = id;
            setTimeout(() => this.watchAllIn(id), JOIN_SETTLE_MS);
        };

        this.dispatcher.subscribe("STREAM_CREATE", this.onStreamCreate);
        this.dispatcher.subscribe("RTC_CONNECTION_STATE", this.onRtcState);
    }

    stop() {
        this.running = false;
        if (!this.dispatcher) return;
        this.dispatcher.unsubscribe("STREAM_CREATE", this.onStreamCreate);
        this.dispatcher.unsubscribe("RTC_CONNECTION_STATE", this.onRtcState);
        // Deliberately does not stop watching anything — leave the user's grid alone.
    }

    // --- work ---

    currentChannel() {
        return this.channelStore.getVoiceChannelId?.() ?? null;
    }

    watchUser(userId) {
        const stream = this.streamStore.getAnyStreamForUser?.(userId)
            ?? this.streamStore.getStreamForUser?.(userId);
        this.watch(stream);
    }

    watchAllIn(channelId) {
        const streams = this.streamStore.getAllApplicationStreamsForChannel?.(channelId) ?? [];
        for (const stream of streams) this.watch(stream);
    }

    watch(stream) {
        if (!this.running || !stream) return;
        if (stream.ownerId === this.me) return;
        // Only streams in the channel we are actually sitting in.
        if (stream.channelId !== this.currentChannel()) return;

        const streamKey = AutoWatchStreams.streamKeyOf(stream);

        if (typeof this.watchThunk === "function") {
            this.watchThunk(stream, { forceMultiple: true, noFocus: true });
        } else {
            // Fallback for when the thunk lookup breaks after a Discord update.
            this.dispatcher.dispatch({ type: "STREAM_WATCH", streamKey, allowMultiple: true });
        }

        this.participant?.selectParticipant?.(stream.channelId, streamKey);
    }
};
