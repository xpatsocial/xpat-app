const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// inlineRequires: defer module loading until first use
// +200-400ms Android cold start improvement (RN Performance 2026 research)
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

module.exports = config;
