import fs from "node:fs";

const MF = "android/app/src/main/AndroidManifest.xml";
let s = fs.readFileSync(MF, "utf8");

const perms = [
  "android.permission.CAMERA",
  "android.permission.ACCESS_FINE_LOCATION",
  "android.permission.ACCESS_COARSE_LOCATION"
];
const block = perms
  .filter(p => !s.includes(p))
  .map(p => `    <uses-permission android:name="${p}" />`)
  .join("\n");
if (block) s = s.replace("<application", block + "\n\n    <application");

if (!s.includes("uses-feature")) {
  s = s.replace(
    "<application",
    '    <uses-feature android:name="android.hardware.camera" android:required="false" />\n    <uses-feature android:name="android.hardware.location.gps" android:required="false" />\n\n    <application'
  );
}

s = s.replace(
  "android:configChanges=",
  'android:screenOrientation="sensorLandscape"\n            android:keepScreenOn="true"\n            android:configChanges='
);

fs.writeFileSync(MF, s);

fs.cpSync("android-res", "android/app/src/main/res", { recursive: true });

console.log("✔ Manifest patched: camera + GPS + sensorLandscape + keepScreenOn");
console.log("✔ Adaptive icon installed");
