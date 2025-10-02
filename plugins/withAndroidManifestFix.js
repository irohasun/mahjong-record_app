// Android の Manifest Merger 競合（appComponentFactory 重複）を回避するためのローカルConfig Plugin。
// 目的: <manifest> に tools 名前空間を追加し、<application> に tools:replace と
// android:appComponentFactory=androidx.core.app.CoreComponentFactory を付与する。

const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * @type {import('@expo/config-plugins').ConfigPlugin}
 */
function withAndroidManifestFix(config) {
  return withAndroidManifest(config, (configMod) => {
    const androidManifest = configMod.modResults.manifest || configMod.modResults;

    // <manifest> の tools 名前空間と package を付与
    if (!androidManifest.$) androidManifest.$ = {};
    if (!androidManifest.$['xmlns:tools']) {
      androidManifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }
    // 一部のビルド環境で package 属性が必須のため補完
    if (!androidManifest.$.package) {
      androidManifest.$.package = 'com.mahjongrecord.app';
    }

    // <application> の取得/生成
    if (!androidManifest.application || !androidManifest.application[0]) {
      androidManifest.application = [{}];
    }
    const app = androidManifest.application[0];
    if (!app.$) app.$ = {};

    // tools:replace に android:appComponentFactory を追加（重複を避けつつ結合）
    const currentReplace = app.$['tools:replace']
      ? String(app.$['tools:replace']).split(',')
      : [];
    if (!currentReplace.includes('android:appComponentFactory')) {
      currentReplace.push('android:appComponentFactory');
    }
    app.$['tools:replace'] = currentReplace.filter(Boolean).join(',');

    // appComponentFactory を AndroidX 実装で明示
    app.$['android:appComponentFactory'] = 'androidx.core.app.CoreComponentFactory';

    return configMod;
  });
}

module.exports = withAndroidManifestFix;


