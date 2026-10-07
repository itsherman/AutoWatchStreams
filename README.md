# AutoWatchStreams

A BetterDiscord plugin that automatically watches every screen share in your
voice channel.

When someone starts streaming, the plugin opens their stream for you. If you
are already watching someone else, the new stream is **added** to Discord's
multistream grid rather than replacing what you were watching. Streams that
were already running when you joined the channel get picked up too.

There is nothing to configure. Enable it and it works.

## Requirements

- Discord **desktop** app (multistream does not exist on the web client)
- [BetterDiscord](https://betterdiscord.app) installed

## Install

### One command

**Windows** (PowerShell):

```powershell
iwr "https://raw.githubusercontent.com/itsherman/AutoWatchStreams/main/AutoWatchStreams.plugin.js" `
  -OutFile "$env:APPDATA\BetterDiscord\plugins\AutoWatchStreams.plugin.js"
```

**macOS**:

```bash
curl -L "https://raw.githubusercontent.com/itsherman/AutoWatchStreams/main/AutoWatchStreams.plugin.js" \
  -o ~/Library/Application\ Support/BetterDiscord/plugins/AutoWatchStreams.plugin.js
```

**Linux**:

```bash
curl -L "https://raw.githubusercontent.com/itsherman/AutoWatchStreams/main/AutoWatchStreams.plugin.js" \
  -o ~/.config/BetterDiscord/plugins/AutoWatchStreams.plugin.js
```

Then in Discord: **Settings → Plugins** and toggle **AutoWatchStreams** on.
No restart needed.

### Without a terminal

1. In Discord, go to **Settings → Plugins** and click **Open Plugins Folder**.
2. On the GitHub page for `AutoWatchStreams.plugin.js`, click **Raw**.
3. Right-click the page, choose **Save As**, and save it into the plugins
   folder from step 1.
4. Make sure the saved filename is exactly `AutoWatchStreams.plugin.js`.
   Browsers sometimes append `.txt`, and BetterDiscord ignores files that do
   not end in `.plugin.js`.
5. Back in Discord, toggle the plugin on under **Settings → Plugins**.

## Updates

The plugin declares an `@updateUrl`, so BetterDiscord checks this repository
itself and prompts you when a newer version is published. You only ever have
to do the install above once.

## Troubleshooting

**Nothing happens when someone streams.** Check that you are in the same voice
channel as the streamer. The plugin deliberately ignores streams in channels
you are not connected to.

**An error toast appears saying Discord internals moved.** Discord renamed the
internal modules the plugin looks up, which happens every so often after a
client update. The plugin needs a new version; open an issue.

**Streams open but show a black tile.** The media engine did not finish
starting before the tile mounted. Increase `CREATE_SETTLE_MS` at the top of
the plugin file and reload.

## How it works

Discord's internal watch function takes a stream descriptor and an options
object. Passing `{ forceMultiple: true }` adds the stream to the set you are
already watching; leaving it out makes Discord replace that set, which is what
tears down an existing grid. `{ noFocus: true }` keeps the new stream from
stealing focus. A `selectParticipant` call afterwards forces the media engine
to begin decoding, which is what actually puts a picture in the tile.

The mechanism was worked out by the
[StreamWindows](https://github.com/relyTzzz/DiscordPlugin) project (GPL-3.0).

## Development

Save `AutoWatchStreams.plugin.js` directly into your BetterDiscord plugins
folder while working on it. BetterDiscord watches that folder and hot-reloads
the plugin every time you save, so there is no build step.

Run the self-check for the stream-key logic with:

```bash
node test.js
```

## A note on BetterDiscord

Client modifications are against Discord's Terms of Service. Enforcement
against plugin users is rare, but using this is at your own risk.
