/* eslint-env node */

/*
 * This file runs in a Node context (it's NOT transpiled by Babel), so use only
 * the ES6 features that are supported by your Node version. https://node.green/
 */

// Configuration for your app
// https://v2.quasar.dev/quasar-cli-vite/quasar-config-js

const { configure } = require('quasar/wrappers');
const path = require('path');
const fs = require('fs');
const { obfuscatePlugin } = require('./build/obfuscate-plugin');

module.exports = configure(function (ctx) {
  return {
    // https://v2.quasar.dev/quasar-cli-vite/prefetch-feature
    // preFetch: true,

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#css
    css: [
      'app.scss'
    ],

    // https://github.com/quasarframework/quasar/wiki/App-with-TypeScript
    // "typescript" is taken care of by @quasar/app-vite
    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#Property%3A-typescript
    typescript: {
      check: false, // or true to enable type checking on dev/build
    },

    // https://v2.quasar.dev/quasar-cli-vite/prefetch-feature
    // preFetch: true,

    // app boot file (/src/boot)
    // https://v2.quasar.dev/quasar-cli-vite/boot-files
    boot: [
      'theme'
    ],

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#Property%3A-css
    // css: [],

    // https://github.com/quasarframework/quasar/tree/dev/extras
    extras: [
      // 'ionicons-v4',
      // 'mdi-v7',
      // 'fontawesome-v6',
      // 'eva-icons',
      // 'themify',
      // 'line-awesome',
      // 'roboto-font-latin-ext', // this or either 'roboto-font', NEVER both!

      'roboto-font', // optional, you are not bound to it
      'material-icons', // optional, you are not bound to it
    ],

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#Property%3A-framework
    framework: {
      config: {
        dark: 'auto', // Let Quasar handle dark mode, but we'll override with our theme system
        notify: {
          position: 'top',
          timeout: 2500,
          textColor: 'white',
          classes: 'terminal-notify'
        }
      },

      // iconSet: 'material-icons', // Quasar icon set
      // lang: 'en-US', // Quasar language pack

      // For special cases outside of where the auto-import strategy can have an impact
      // (like functional components as one of the examples),
      // you can manually specify Quasar components/directives to be available everywhere:
      //
      // components: [],
      // directives: [],

      // Quasar plugins
      plugins: [
        'Meta',
        'LocalStorage',
        'SessionStorage',
        'Notify'
      ]
    },

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#Property%3A-devServer
    devServer: {
      https: false,
      port: 9000,
      open: true // opens browser window automatically
    },

    // Extend Vite config to serve data from root /data folder
    extendViteConf(viteConf) {
      // Allow serving files from parent directory (for ../data)
      viteConf.server = viteConf.server || {};
      viteConf.server.fs = viteConf.server.fs || {};
      viteConf.server.fs.allow = viteConf.server.fs.allow || [];
      viteConf.server.fs.allow.push(path.resolve(__dirname, '..'));
    },

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#Property%3A-build
    build: {
      // Copy data files to build output after build completes
      afterBuild() {
        const srcYaml = path.resolve(__dirname, '../data/kenzik.yml');
        const destDir = path.resolve(__dirname, 'dist/spa/data');
        const destYaml = path.join(destDir, 'kenzik.yml');

        // Create data directory in dist
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }

        // Copy YAML file
        fs.copyFileSync(srcYaml, destYaml);
        console.log(' Data • Copied kenzik.yml to dist/spa/data/');
      },
      target: {
        browser: [ 'es2019', 'edge88', 'firefox78', 'chrome87', 'safari13.1' ],
        node: 'node20'
      },

      vueRouterMode: 'history', // available values: 'hash', 'history'
      // vueRouterBase,
      // vueCompilerOptions: {},

      // https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#Property%3A-vite
      viteVuePluginOptions: {
        script: {
          propsDestructure: true
        }
      },

      vitePlugins: [
        // Easter egg obfuscation - encodes hidden commands with git hash
        [obfuscatePlugin, {}],
      ]
    },

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#Property%3A-animations
    animations: [],

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#ssr-define
    ssr: {
      // ssrPwaHtmlFilename: 'offline.html', // do NOT use index.html as name!
      // will mess up SSR

      // extendSSRWebserverConf (esbuildConf) {},
      // extendSSRWebserverConf (esbuildConf) {},
    },

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#Property%3A-pwa
    pwa: {
      workboxMode: 'generateSW', // or 'injectManifest'
      // injectPwaMetaTags: true,
      // swFilename: 'sw.js',
      // manifestFilename: 'manifest.json',
      // useCredentialsForManifest: false,
      // extendGenerateSWOptions (cfg) {}
      // extendInjectManifestOptions (cfg) {},
      // extendManifestJson (json) {}
      // extendPWACustomSWConf (esbuildConf) {}
      // extendSWCustomHeaders (headers) {}
      // extendSWCustomStrategies (strategies) {}
      // extendSWCustomRoutes (routes) {}
      // swUrl: ...,
      // ...
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#Property%3A-cordova
    cordova: {
      // noIosLegacyBuildFlag: true, // uncomment only if you know what you are doing
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#Property%3A-capacitor
    capacitor: {
      hideSplashscreen: true
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#Property%3A-electron
    electron: {
      // extendElectronMainConf (esbuildConf)
      // extendElectronPreloadConf (esbuildConf)

      // specify the debugging port to use for the Electron app when running in development mode
      inspectPort: 5858,

      bundler: 'packager', // 'packager' or 'builder'

      packager: {
        // https://github.com/electron-userland/electron-packager/blob/master/docs/api.md#options
        // OS X / Mac App Store
        // appBundleId: '',
        // appCategoryType: '',
        // osxSign: '',
        // protocol: 'myapp://path',
        // Windows only
        // win32metadata: { ... }
      },

      builder: {
        // https://www.electron.build/configuration/configuration

        appId: 'kenzik-resume-web'
      }
    }
  };
});

