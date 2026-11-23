import fs from "node:fs";
import path from "node:path";

const cfg = JSON.parse(fs.readFileSync("capacitor.config.json", "utf8"));
const pkg = cfg.appId;
const main = "android/app/src/main";
const read = p => fs.readFileSync(p, "utf8");
const write = (p, s) => fs.writeFileSync(p, s);

/* --- Разрешения: камера, GPS, интернет + альбомная ориентация + экран не гаснет --- */
const MF = path.join(main, "AndroidManifest.xml");
let mf = read(MF);
const perms = [
  "android.permission.CAMERA",
  "android.permission.ACCESS_FINE_LOCATION",
  "android.permission.ACCESS_COARSE_LOCATION",
  "android.permission.INTERNET"
];
const block = perms.filter(p => !mf.includes(p))
  .map(p => `    <uses-permission android:name="${p}" />`).join("\n");
if (block) mf = mf.replace("<application", block + "\n\n    <application");
if (!mf.includes("uses-feature")) {
  mf = mf.replace("<application",
    '    <uses-feature android:name="android.hardware.camera" android:required="false" />\n' +
    '    <uses-feature android:name="android.hardware.location.gps" android:required="false" />\n\n    <application');
}
if (!mf.includes("android:screenOrientation")) {
  mf = mf.replace("android:configChanges=",
    'android:screenOrientation="sensorLandscape"\n            android:keepScreenOn="true"\n            android:configChanges=');
}
write(MF, mf);

/* --- MainActivity: прячем системную строку состояния и панель навигации --- */
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

/* --- Иконка-радар, если папка android-res есть в репозитории --- */
if (fs.existsSync("android-res")) {
  fs.cpSync("android-res", path.join(main, "res"), { recursive: true });
}

/* --- Полноэкранная тема запуска --- */
const styles = path.join(main, "res/values/styles.xml");
if (fs.existsSync(styles)) {
  let st = read(styles);
  if (!st.includes("android:windowFullscreen")) {
    st = st.replace(/(<style name="AppTheme.NoActionBarLaunch"[^>]*>)/,
      '$1\n        <item name="android:windowFullscreen">true</item>\n        <item name="android:windowContentOverlay">@null</item>');
    write(styles, st);
  }
}

/* --- Gradle: длинные таймауты, повторы скачивания, кэш, память --- */
const gp = "android/gradle.properties";
let props = fs.existsSync(gp) ? read(gp) : "";
const wanted = {
  "org.gradle.jvmargs": "-Xmx2560m -XX:MaxMetaspaceSize=768m -Dfile.encoding=UTF-8",
  "org.gradle.parallel": "true",
  "org.gradle.caching": "true",
  "org.gradle.daemon": "false",
  "systemProp.org.gradle.internal.http.connectionTimeout": "180000",
  "systemProp.org.gradle.internal.http.socketTimeout": "180000",
  "systemProp.org.gradle.internal.repository.max.tentatives": "6",
  "systemProp.org.gradle.internal.repository.initial.backoff": "1500"
};
for (const [k, v] of Object.entries(wanted)) {
  const re = new RegExp("^\\s*" + k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*=.*$", "m");
  if (re.test(props)) props = props.replace(re, k + "=" + v);
  else props += (props.endsWith("\n") || props === "" ? "" : "\n") + k + "=" + v + "\n";
}
write(gp, props);

/* --- Дополнительные зеркала репозиториев на случай сбоя основного --- */
const bg = "android/build.gradle";
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

/* --- Только предупреждения, сборку не роняем --- */
["www/index.html", "www/style.css", "www/app.js"].forEach(f => {
  if (!fs.existsSync(f)) console.warn("⚠ нет файла " + f);
  else console.log("✔ " + f + " (" + fs.statSync(f).size + " байт)");
});

console.log("✔ Разрешения, альбомная ориентация, полный экран");
console.log("✔ Gradle: повторы 6, таймаут 180 с, зеркала, кэш");
