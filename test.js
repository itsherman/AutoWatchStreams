// Self-check for the stream-key logic — the one bit that silently breaks.
// Run: node test.js
const assert = require("assert");
const P = require("./AutoWatchStreams.plugin.js");

// guild stream
assert.strictEqual(
    P.streamKeyOf({ streamType: "guild", guildId: "G", channelId: "C", ownerId: "U" }),
    "guild:G:C:U"
);

// DM / group call stream has no guildId
assert.strictEqual(
    P.streamKeyOf({ streamType: "call", channelId: "C", ownerId: "U" }),
    "call:C:U"
);

// owner id round-trips out of both key shapes
assert.strictEqual(P.ownerOf("guild:G:C:U"), "U");
assert.strictEqual(P.ownerOf("call:C:U"), "U");

console.log("ok");
