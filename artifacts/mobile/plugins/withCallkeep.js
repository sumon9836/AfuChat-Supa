const { withAndroidManifest } = require("@expo/config-plugins");

const PERMISSIONS = [
  "android.permission.MANAGE_OWN_CALLS",
  "android.permission.FOREGROUND_SERVICE",
  "android.permission.FOREGROUND_SERVICE_PHONE_CALL",
  "android.permission.READ_PHONE_STATE",
  "android.permission.READ_PHONE_NUMBERS",
];

const CK_SERVICE = "io.wazo.callkeep.VoiceConnectionService";

const withCallkeep = (config) =>
  withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    if (!manifest["uses-permission"]) manifest["uses-permission"] = [];
    for (const perm of PERMISSIONS) {
      if (!manifest["uses-permission"].some((p) => p.$?.["android:name"] === perm)) {
        manifest["uses-permission"].push({ $: { "android:name": perm } });
      }
    }

    const app = manifest.application[0];
    if (!app.service) app.service = [];

    if (!app.service.some((s) => s.$?.["android:name"] === CK_SERVICE)) {
      app.service.push({
        $: {
          "android:name": CK_SERVICE,
          "android:label": "@string/app_name",
          "android:exported": "true",
          "android:permission": "android.permission.BIND_TELECOM_CONNECTION_SERVICE",
        },
        "intent-filter": [
          {
            action: [
              { $: { "android:name": "android.telecom.ConnectionService" } },
            ],
          },
        ],
      });
    }

    return cfg;
  });

module.exports = withCallkeep;
