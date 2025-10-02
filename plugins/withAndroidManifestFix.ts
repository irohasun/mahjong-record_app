import { ConfigPlugin, withAndroidManifest } from '@expo/config-plugins';

// AndroidX と support ライブラリの競合で発生する appComponentFactory の重複を回避するため、
// AndroidManifest.xml の <manifest> に tools 名前空間、<application> に tools:replace と appComponentFactory を付与する。
// 目的: Manifest Merger の競合解消（最小変更）。
const withAndroidManifestFix: ConfigPlugin = config => {
  return withAndroidManifest(config, configMod => {
    // 型差異により `$` や `application` へのアクセスでエラーとなるため any キャストを行う
    const manifest: any = configMod.modResults as any;

    // ensure tools namespace on <manifest>
    if (!manifest.$) manifest.$ = {} as any;
    if (!manifest.$['xmlns:tools']) {
      manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    // ensure application exists
    if (!manifest.application || !manifest.application[0]) {
      manifest.application = [{} as any];
    }
    const app: any = manifest.application[0];
    if (!app.$) app.$ = {} as any;

    // add tools:replace and appComponentFactory
    app.$['tools:replace'] = [
      ...(app.$['tools:replace'] ? String(app.$['tools:replace']).split(',') : []),
      'android:appComponentFactory',
    ]
      .filter(Boolean)
      .join(',');
    app.$['android:appComponentFactory'] = 'androidx.core.app.CoreComponentFactory';

    return configMod;
  });
};

export default withAndroidManifestFix;


