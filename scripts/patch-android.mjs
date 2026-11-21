import fs from "node:fs";

const cfg = JSON.parse(fs.readFileSync("capacitor.config.json", "utf8"));
const pkg = cfg.appId;
const MF = "android/app/src/main/AndroidManifest.xml";
let s = fs.readFileSync(MF, "utf8");

const perms = [
  "android.permission.CAMERA",
  "android.permission.ACCESS_FINE_LOCATION",
  "android.permission.ACCESS_COARSE_LOCATION"
];
const block = perms.filter(p => !s.includes(p))
  .map(p => `    <uses-permission android:name="${p}" />`).join("\n");
if (block) s = s.replace("<application", block + "\n\n    <application");

if (!s.includes("uses-feature")) {
  s = s.replace("<application",
    '    <uses-feature android:name="android.hardware.camera" android:required="false" />\n' +
    '    <uses-feature android:name="android.hardware.location.gps" android:required="false" />\n\n    <application');
}
s = s.replace("android:configChanges=",
  'android:screenOrientation="sensorLandscape"\n            android:keepScreenOn="true"\n            android:configChanges=');
fs.writeFileSync(MF, s);

const javaDir = "android/app/src/main/java/" + pkg.replace(/\./g, "/");
fs.mkdirSync(javaDir, { recursive: true });
fs.writeFileSync(javaDir + "/MainActivity.java",
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

fs.cpSync("android-res", "android/app/src/main/res", { recursive: true });

const styles = "android/app/src/main/res/values/styles.xml";
if (fs.existsSync(styles)) {
  let st = fs.readFileSync(styles, "utf8");
  if (!st.includes("android:windowFullscreen")) {
    st = st.replace(/(<style name="AppTheme.NoActionBarLaunch"[^>]*>)/,
      '$1\n        <item name="android:windowFullscreen">true</item>\n        <item name="android:windowContentOverlay">@null</item>');
    fs.writeFileSync(styles, st);
  }
}

console.log("✔ Immersive fullscreen MainActivity written (" + pkg + ")");
console.log("✔ Manifest: camera + GPS + sensorLandscape + keepScreenOn");
console.log("✔ Icon + fullscreen launch theme installed");
