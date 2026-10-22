import { defineConfig } from 'cypress';
import { initPlugin as initVisualRegressionPlugin } from '@pixsame/cypress-plugin-visual-regression-diff/plugins';

export default defineConfig({
  expose: {
    // On CI a `matchImage()` without a committed baseline fails instead of silently creating one.
    pluginVisualRegressionCreateMissingImages: !process.env.CI,
  },
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
    // Fixed viewport so snapshots don't depend on the runner's window size.
    viewportWidth: 1920,
    viewportHeight: 1080,
    setupNodeEvents(on, config) {
      initVisualRegressionPlugin(on, config);

      // Headless browsers default to 1280x720, which scales the 1920x1080 viewport down in screenshots.
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.name === 'electron') {
          launchOptions.preferences.width = 1920;
          launchOptions.preferences.height = 1080;
        } else if (browser.family === 'chromium' && browser.isHeadless) {
          launchOptions.args.push('--window-size=1920,1080');
        }
        return launchOptions;
      });
    },
  },
});
