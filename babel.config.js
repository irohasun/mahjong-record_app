// Reanimated の worklets を正しくトランスパイルするため、
// Babel に react-native-reanimated のプラグインを追加します。
// 注意: 本プラグインは必ず最後に指定する必要があります。
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
    ],
  };
};


