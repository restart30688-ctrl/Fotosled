import fs from "node:fs";
import path from "node:path";

const cfg = JSON.parse(fs.readFileSync("capacitor.config.json", "utf8"));
const pkg = cfg.appId;
const root = "android";
const main = path.join(root, "app/src/main");

function read(p) { return fs.readFileSync(p, "utf8"); }
function write(p, s) { fs.writeFileSync(p, s); }

/* ---------- AndroidManifest: permissions, landscape, keep screen on ---------- */
const MF = path.join(main, "AndroidManifest.xml");
let mf = read(MF);

const perms = [
  "android.permission.CAMERA",
  "android.permission.ACCESS_FINE_LOCATION",
  "android.permission.ACCESS_COARSE_LOCATION",
  "android.permission.INTERNET"
];
const permBlock = perms
  .filter(p => !mf.includes(p))
  .map(p => `    <uses-permission android:name="${p}" />`)
  .join("\n");
if (permBlock) mf = mf.replace("<application", permBlock + "\n\n    <application");

if (!mf.includes("uses-feature")) {
  mf = mf.replace(
    "<application",
    '    <uses-feature android:name="android.hardware.camera" android:required="false" />\n' +
    '    <uses-feature android:name="android.hardware.location.gps" android:required="false" />\n\n    <application'
  );
}
if (!mf.includes("android:screenOrientation")) {
  mf = mf.replace(
    "android:configChanges=",
    'android:screenOrientation="sensorLandscape"\n            android:keepScreenOn="true"\n            android:configChanges='
  );
}
write(MF, mf);

/* ---------- MainActivity: immersive fullscreen ---------- */
const javaDir = path.join(main, "java", ...pkg.split("."));
fs.mkdirSync(javaDir, { recursive: true });
write(path.join(javaDir, "MainActivity.java"),
`package ${pkg};

import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        hideSystemBars();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    @Override
    public void onResume() {
        super.onResume();
        hideSystemBars();
    }

    @SuppressWarnings("deprecation")
    private void hideSystemBars() {
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_FULLSCREEN
            | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
    }
}
`);

/* ---------- launcher icon ---------- */
if (fs.existsSync("android-res")) {
  fs.cpSync("android-res", path.join(main, "res"), { recursive: true });
}

/* ---------- fullscreen launch theme ---------- */
const styles = path.join(main, "res/values/styles.xml");
if (fs.existsSync(styles)) {
  let st = read(styles);
  if (!st.includes("android:windowFullscreen")) {
    st = st.replace(
      /(<style name="AppTheme.NoActionBarLaunch"[^>]*>)/,
      '$1\n        <item name="android:windowFullscreen">true</item>\n        <item name="android:windowContentOverlay">@null</item>'
    );
    write(styles, st);
  }
}

/* ---------- Gradle: network retries, timeouts, memory ---------- */
const gp = path.join(root, "gradle.properties");
let props = fs.existsSync(gp) ? read(gp) : "";
const wanted = {
  "org.gradle.jvmargs": "-Xmx2560m -XX:MaxMetaspaceSize=768m -Dfile.encoding=UTF-8",
  "org.gradle.parallel": "true",
  "org.gradle.caching": "true",
  "org.gradle.daemon": "false",
  "systemProp.org.gradle.internal.http.connectionTimeout": "180000",
  "systemProp.org.gradle.internal.http.socketTimeout": "180000",
  "systemProp.org.gradle.internal.repository.max.tentatives": "6",
  "systemProp.org.gradle.internal.repository.initial.backoff": "1500",
  "systemProp.org.gradle.internal.publish.checksums.insecure": "false"
};
for (const [k, v] of Object.entries(wanted)) {
  const re = new RegExp("^\\s*" + k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*=.*$", "m");
  if (re.test(props)) props = props.replace(re, k + "=" + v);
  else props += (props.endsWith("\n") || props === "" ? "" : "\n") + k + "=" + v + "\n";
}
write(gp, props);

/* ---------- Gradle: explicit repositories + mirrors ---------- */
const bg = path.join(root, "build.gradle");
if (fs.existsSync(bg)) {
  let b = read(bg);
  if (!b.includes("/* fotosled-repos */")) {
    b += `
/* fotosled-repos */
allprojects {
    repositories {
        google()
        mavenCentral()
        maven { url "https://repo1.maven.org/maven2/" }
        maven { url "https://maven.google.com/" }
    }
}
`;
    write(bg, b);
  }
}

/* ---------- web assets sanity check ---------- */
const need = ["www/index.html", "www/style.css", "www/app.js"];
const missing = need.filter(f => !fs.existsSync(f));
if (missing.length) {
  console.error("Missing web assets: " + missing.join(", "));
  process.exit(1);
}
const appjs = read("www/app.js");
const html = read("www/index.html");
if (!html.includes('src="app.js"')) {
  console.error("index.html does not load app.js");
  process.exit(1);
}
if (!appjs.includes("__FS_OK")) {
  console.error("app.js is truncated (no boot flag)");
  process.exit(1);
}

console.log("✔ Manifest: camera + GPS + sensorLandscape + keepScreenOn");
console.log("✔ Immersive fullscreen MainActivity (" + pkg + ")");
console.log("✔ Icon + fullscreen launch theme");
console.log("✔ Gradle: retries=6, timeouts=180s, mirrors, caching");
console.log("✔ Web assets present: index.html + style.css + app.js (" + appjs.length + " bytes)");
