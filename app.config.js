// Dynamic Expo config — reads from app.json and injects env vars for secrets
const appJson = require('./app.json');

const config = appJson.expo;

// Override Google Maps API key from env var (don't commit real key)
if (config.android?.config?.googleMaps) {
  config.android.config.googleMaps.apiKey =
    process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyD-c7Zkn2AffwCtFOu9UW8covVAumM-h1c';
}

module.exports = () => config;
