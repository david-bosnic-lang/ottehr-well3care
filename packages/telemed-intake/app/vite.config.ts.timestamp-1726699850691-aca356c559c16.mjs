// vite.config.ts
import { sentryVitePlugin } from "file:///Users/saewitz/Documents/ottehr-test/ottehr/node_modules/.pnpm/@sentry+vite-plugin@2.21.1/node_modules/@sentry/vite-plugin/dist/esm/index.mjs";
import * as path2 from "path";
import { defineConfig as defineConfig2, loadEnv as loadEnv2, mergeConfig } from "file:///Users/saewitz/Documents/ottehr-test/ottehr/node_modules/.pnpm/vite@4.5.3_@types+node@18.19.42_terser@5.31.3/node_modules/vite/dist/node/index.js";

// ../../../vite.config.ts
import react from "file:///Users/saewitz/Documents/ottehr-test/ottehr/node_modules/.pnpm/@vitejs+plugin-react@4.3.1_vite@4.5.3_@types+node@18.19.42_terser@5.31.3_/node_modules/@vitejs/plugin-react/dist/index.mjs";
import browserslistToEsbuild from "file:///Users/saewitz/Documents/ottehr-test/ottehr/node_modules/.pnpm/browserslist-to-esbuild@1.2.0/node_modules/browserslist-to-esbuild/src/index.js";
import * as path from "path";
import { defineConfig, loadEnv } from "file:///Users/saewitz/Documents/ottehr-test/ottehr/node_modules/.pnpm/vite@4.5.3_@types+node@18.19.42_terser@5.31.3/node_modules/vite/dist/node/index.js";
import svgr from "file:///Users/saewitz/Documents/ottehr-test/ottehr/node_modules/.pnpm/vite-plugin-svgr@4.2.0_rollup@2.79.1_typescript@4.9.5_vite@4.5.3_@types+node@18.19.42_terser@5.31.3_/node_modules/vite-plugin-svgr/dist/index.js";
import viteTsconfigPaths from "file:///Users/saewitz/Documents/ottehr-test/ottehr/node_modules/.pnpm/vite-tsconfig-paths@4.3.2_typescript@4.9.5_vite@4.5.3_@types+node@18.19.42_terser@5.31.3_/node_modules/vite-tsconfig-paths/dist/index.mjs";
import dotenv from "file:///Users/saewitz/Documents/ottehr-test/ottehr/node_modules/.pnpm/dotenv@16.4.5/node_modules/dotenv/lib/main.js";
dotenv.config();
var vite_config_default = ({ mode }) => {
  const envDir = "./env";
  const env = loadEnv(mode, path.join(process.cwd(), envDir), "");
  return defineConfig({
    envDir,
    publicDir: "public",
    plugins: [react(), viteTsconfigPaths(), svgr()],
    server: {
      open: true,
      port: env.PORT ? parseInt(env.PORT) : void 0
    },
    optimizeDeps: {
      exclude: ["js-big-decimal", "jsonpath-plus"]
    },
    build: {
      outDir: "./build",
      target: browserslistToEsbuild(),
      rollupOptions: {
        external: ["jsonpath-plus"]
      }
    },
    define: {
      "process.env": process.env
    }
  });
};

// vite.config.ts
var __vite_injected_original_dirname = "/Users/saewitz/Documents/ottehr-test/ottehr/packages/telemed-intake/app";
var vite_config_default2 = (env) => {
  const { mode } = env;
  const envDir = "./env";
  const appEnv = loadEnv2(mode, path2.join(process.cwd(), envDir), "");
  const shouldUploadSentrySourceMaps = mode === "testing" || mode === "staging" || mode === "dev" || mode === "production" || mode === "training";
  console.log(mode);
  const plugins = [
    // IstanbulPlugin({
    //   include: 'src/*',
    //   extension: ['.js', '.ts', '.tsx'],
    // }),
  ];
  if (shouldUploadSentrySourceMaps)
    plugins.push(
      sentryVitePlugin({
        authToken: appEnv.SENTRY_AUTH_TOKEN,
        org: "zapehr",
        project: "ottehr-telemed-qrs-ui",
        sourcemaps: {
          assets: ["./build/**/*"]
        }
      })
    );
  return mergeConfig(
    vite_config_default({ mode }),
    defineConfig2({
      //   optimizeDeps: {
      //     include: ['playwright'],
      //   },
      resolve: {
        alias: {
          "@assets": path2.resolve(__vite_injected_original_dirname, appEnv.ASSETS_PATH || "/src/assets"),
          "@theme": path2.resolve(__vite_injected_original_dirname, appEnv.THEME_PATH || "/src/assets/theme"),
          "@defaultTheme": path2.resolve(__vite_injected_original_dirname, "/src/assets/theme"),
          "@translations": path2.resolve(__vite_injected_original_dirname, appEnv.TRANSLATIONS_PATH || "/src/lib"),
          "@defaultTranslations": path2.resolve(__vite_injected_original_dirname, "/src/lib")
        }
      },
      optimizeDeps: {
        include: ["@mui/icons-material", "@mui/material", "@emotion/react", "@emotion/styled"]
      },
      build: {
        sourcemap: mode === "default" || shouldUploadSentrySourceMaps
      },
      server: {
        open: "location/ak/in-person/prebook"
      },
      plugins
    })
  );
};
export {
  vite_config_default2 as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiLCAiLi4vLi4vLi4vdml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvc2Fld2l0ei9Eb2N1bWVudHMvb3R0ZWhyLXRlc3Qvb3R0ZWhyL3BhY2thZ2VzL3RlbGVtZWQtaW50YWtlL2FwcFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL3NhZXdpdHovRG9jdW1lbnRzL290dGVoci10ZXN0L290dGVoci9wYWNrYWdlcy90ZWxlbWVkLWludGFrZS9hcHAvdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL3NhZXdpdHovRG9jdW1lbnRzL290dGVoci10ZXN0L290dGVoci9wYWNrYWdlcy90ZWxlbWVkLWludGFrZS9hcHAvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBzZW50cnlWaXRlUGx1Z2luIH0gZnJvbSAnQHNlbnRyeS92aXRlLXBsdWdpbic7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgUGx1Z2luT3B0aW9uLCBkZWZpbmVDb25maWcsIGxvYWRFbnYsIG1lcmdlQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgY29uZmlnIGZyb20gJy4uLy4uLy4uL3ZpdGUuY29uZmlnJztcblxuZXhwb3J0IGRlZmF1bHQgKGVudikgPT4ge1xuICBjb25zdCB7IG1vZGUgfSA9IGVudjtcbiAgY29uc3QgZW52RGlyID0gJy4vZW52JztcbiAgY29uc3QgYXBwRW52ID0gbG9hZEVudihtb2RlLCBwYXRoLmpvaW4ocHJvY2Vzcy5jd2QoKSwgZW52RGlyKSwgJycpO1xuXG4gIGNvbnN0IHNob3VsZFVwbG9hZFNlbnRyeVNvdXJjZU1hcHMgPVxuICAgIG1vZGUgPT09ICd0ZXN0aW5nJyB8fCBtb2RlID09PSAnc3RhZ2luZycgfHwgbW9kZSA9PT0gJ2RldicgfHwgbW9kZSA9PT0gJ3Byb2R1Y3Rpb24nIHx8IG1vZGUgPT09ICd0cmFpbmluZyc7XG4gIGNvbnNvbGUubG9nKG1vZGUpO1xuXG4gIGNvbnN0IHBsdWdpbnM6IFBsdWdpbk9wdGlvbltdID0gW1xuICAgIC8vIElzdGFuYnVsUGx1Z2luKHtcbiAgICAvLyAgIGluY2x1ZGU6ICdzcmMvKicsXG4gICAgLy8gICBleHRlbnNpb246IFsnLmpzJywgJy50cycsICcudHN4J10sXG4gICAgLy8gfSksXG4gIF07XG5cbiAgaWYgKHNob3VsZFVwbG9hZFNlbnRyeVNvdXJjZU1hcHMpXG4gICAgcGx1Z2lucy5wdXNoKFxuICAgICAgc2VudHJ5Vml0ZVBsdWdpbih7XG4gICAgICAgIGF1dGhUb2tlbjogYXBwRW52LlNFTlRSWV9BVVRIX1RPS0VOLFxuICAgICAgICBvcmc6ICd6YXBlaHInLFxuICAgICAgICBwcm9qZWN0OiAnb3R0ZWhyLXRlbGVtZWQtcXJzLXVpJyxcbiAgICAgICAgc291cmNlbWFwczoge1xuICAgICAgICAgIGFzc2V0czogWycuL2J1aWxkLyoqLyonXSxcbiAgICAgICAgfSxcbiAgICAgIH0pXG4gICAgKTtcblxuICByZXR1cm4gbWVyZ2VDb25maWcoXG4gICAgY29uZmlnKHsgbW9kZSB9KSxcbiAgICBkZWZpbmVDb25maWcoe1xuICAgICAgLy8gICBvcHRpbWl6ZURlcHM6IHtcbiAgICAgIC8vICAgICBpbmNsdWRlOiBbJ3BsYXl3cmlnaHQnXSxcbiAgICAgIC8vICAgfSxcbiAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgYWxpYXM6IHtcbiAgICAgICAgICAnQGFzc2V0cyc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIGFwcEVudi5BU1NFVFNfUEFUSCB8fCAnL3NyYy9hc3NldHMnKSxcbiAgICAgICAgICAnQHRoZW1lJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgYXBwRW52LlRIRU1FX1BBVEggfHwgJy9zcmMvYXNzZXRzL3RoZW1lJyksXG4gICAgICAgICAgJ0BkZWZhdWx0VGhlbWUnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnL3NyYy9hc3NldHMvdGhlbWUnKSxcbiAgICAgICAgICAnQHRyYW5zbGF0aW9ucyc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIGFwcEVudi5UUkFOU0xBVElPTlNfUEFUSCB8fCAnL3NyYy9saWInKSxcbiAgICAgICAgICAnQGRlZmF1bHRUcmFuc2xhdGlvbnMnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnL3NyYy9saWInKSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICBvcHRpbWl6ZURlcHM6IHtcbiAgICAgICAgaW5jbHVkZTogWydAbXVpL2ljb25zLW1hdGVyaWFsJywgJ0BtdWkvbWF0ZXJpYWwnLCAnQGVtb3Rpb24vcmVhY3QnLCAnQGVtb3Rpb24vc3R5bGVkJ10sXG4gICAgICB9LFxuICAgICAgYnVpbGQ6IHtcbiAgICAgICAgc291cmNlbWFwOiBtb2RlID09PSAnZGVmYXVsdCcgfHwgc2hvdWxkVXBsb2FkU2VudHJ5U291cmNlTWFwcyxcbiAgICAgIH0sXG4gICAgICBzZXJ2ZXI6IHtcbiAgICAgICAgb3BlbjogJ2xvY2F0aW9uL2FrL2luLXBlcnNvbi9wcmVib29rJyxcbiAgICAgIH0sXG4gICAgICBwbHVnaW5zLFxuICAgIH0pXG4gICk7XG59O1xuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvc2Fld2l0ei9Eb2N1bWVudHMvb3R0ZWhyLXRlc3Qvb3R0ZWhyXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvc2Fld2l0ei9Eb2N1bWVudHMvb3R0ZWhyLXRlc3Qvb3R0ZWhyL3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9zYWV3aXR6L0RvY3VtZW50cy9vdHRlaHItdGVzdC9vdHRlaHIvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IGJyb3dzZXJzbGlzdFRvRXNidWlsZCBmcm9tICdicm93c2Vyc2xpc3QtdG8tZXNidWlsZCc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgZGVmaW5lQ29uZmlnLCBsb2FkRW52IH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgc3ZnciBmcm9tICd2aXRlLXBsdWdpbi1zdmdyJztcbmltcG9ydCB2aXRlVHNjb25maWdQYXRocyBmcm9tICd2aXRlLXRzY29uZmlnLXBhdGhzJztcbmltcG9ydCBkb3RlbnYgZnJvbSAnZG90ZW52JztcblxuZG90ZW52LmNvbmZpZygpO1xuXG5leHBvcnQgZGVmYXVsdCAoeyBtb2RlIH0pID0+IHtcbiAgY29uc3QgZW52RGlyID0gJy4vZW52JztcbiAgY29uc3QgZW52ID0gbG9hZEVudihtb2RlLCBwYXRoLmpvaW4ocHJvY2Vzcy5jd2QoKSwgZW52RGlyKSwgJycpO1xuXG4gIHJldHVybiBkZWZpbmVDb25maWcoe1xuICAgIGVudkRpcjogZW52RGlyLFxuICAgIHB1YmxpY0RpcjogJ3B1YmxpYycsXG4gICAgcGx1Z2luczogW3JlYWN0KCksIHZpdGVUc2NvbmZpZ1BhdGhzKCksIHN2Z3IoKV0sXG4gICAgc2VydmVyOiB7XG4gICAgICBvcGVuOiB0cnVlLFxuICAgICAgcG9ydDogZW52LlBPUlQgPyBwYXJzZUludChlbnYuUE9SVCkgOiB1bmRlZmluZWQsXG4gICAgfSxcbiAgICBvcHRpbWl6ZURlcHM6IHtcbiAgICAgIGV4Y2x1ZGU6IFsnanMtYmlnLWRlY2ltYWwnLCAnanNvbnBhdGgtcGx1cyddLFxuICAgIH0sXG4gICAgYnVpbGQ6IHtcbiAgICAgIG91dERpcjogJy4vYnVpbGQnLFxuICAgICAgdGFyZ2V0OiBicm93c2Vyc2xpc3RUb0VzYnVpbGQoKSxcbiAgICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgICAgZXh0ZXJuYWw6IFsnanNvbnBhdGgtcGx1cyddLFxuICAgICAgfSxcbiAgICB9LFxuICAgIGRlZmluZToge1xuICAgICAgJ3Byb2Nlc3MuZW52JzogcHJvY2Vzcy5lbnYsXG4gICAgfSxcbiAgfSk7XG59O1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF1WSxTQUFTLHdCQUF3QjtBQUN4YSxZQUFZQSxXQUFVO0FBQ3RCLFNBQXVCLGdCQUFBQyxlQUFjLFdBQUFDLFVBQVMsbUJBQW1COzs7QUNGa1AsT0FBTyxXQUFXO0FBQ3JVLE9BQU8sMkJBQTJCO0FBQ2xDLFlBQVksVUFBVTtBQUN0QixTQUFTLGNBQWMsZUFBZTtBQUN0QyxPQUFPLFVBQVU7QUFDakIsT0FBTyx1QkFBdUI7QUFDOUIsT0FBTyxZQUFZO0FBRW5CLE9BQU8sT0FBTztBQUVkLElBQU8sc0JBQVEsQ0FBQyxFQUFFLEtBQUssTUFBTTtBQUMzQixRQUFNLFNBQVM7QUFDZixRQUFNLE1BQU0sUUFBUSxNQUFXLFVBQUssUUFBUSxJQUFJLEdBQUcsTUFBTSxHQUFHLEVBQUU7QUFFOUQsU0FBTyxhQUFhO0FBQUEsSUFDbEI7QUFBQSxJQUNBLFdBQVc7QUFBQSxJQUNYLFNBQVMsQ0FBQyxNQUFNLEdBQUcsa0JBQWtCLEdBQUcsS0FBSyxDQUFDO0FBQUEsSUFDOUMsUUFBUTtBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ04sTUFBTSxJQUFJLE9BQU8sU0FBUyxJQUFJLElBQUksSUFBSTtBQUFBLElBQ3hDO0FBQUEsSUFDQSxjQUFjO0FBQUEsTUFDWixTQUFTLENBQUMsa0JBQWtCLGVBQWU7QUFBQSxJQUM3QztBQUFBLElBQ0EsT0FBTztBQUFBLE1BQ0wsUUFBUTtBQUFBLE1BQ1IsUUFBUSxzQkFBc0I7QUFBQSxNQUM5QixlQUFlO0FBQUEsUUFDYixVQUFVLENBQUMsZUFBZTtBQUFBLE1BQzVCO0FBQUEsSUFDRjtBQUFBLElBQ0EsUUFBUTtBQUFBLE1BQ04sZUFBZSxRQUFRO0FBQUEsSUFDekI7QUFBQSxFQUNGLENBQUM7QUFDSDs7O0FEcENBLElBQU0sbUNBQW1DO0FBS3pDLElBQU9DLHVCQUFRLENBQUMsUUFBUTtBQUN0QixRQUFNLEVBQUUsS0FBSyxJQUFJO0FBQ2pCLFFBQU0sU0FBUztBQUNmLFFBQU0sU0FBU0MsU0FBUSxNQUFXLFdBQUssUUFBUSxJQUFJLEdBQUcsTUFBTSxHQUFHLEVBQUU7QUFFakUsUUFBTSwrQkFDSixTQUFTLGFBQWEsU0FBUyxhQUFhLFNBQVMsU0FBUyxTQUFTLGdCQUFnQixTQUFTO0FBQ2xHLFVBQVEsSUFBSSxJQUFJO0FBRWhCLFFBQU0sVUFBMEI7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBS2hDO0FBRUEsTUFBSTtBQUNGLFlBQVE7QUFBQSxNQUNOLGlCQUFpQjtBQUFBLFFBQ2YsV0FBVyxPQUFPO0FBQUEsUUFDbEIsS0FBSztBQUFBLFFBQ0wsU0FBUztBQUFBLFFBQ1QsWUFBWTtBQUFBLFVBQ1YsUUFBUSxDQUFDLGNBQWM7QUFBQSxRQUN6QjtBQUFBLE1BQ0YsQ0FBQztBQUFBLElBQ0g7QUFFRixTQUFPO0FBQUEsSUFDTCxvQkFBTyxFQUFFLEtBQUssQ0FBQztBQUFBLElBQ2ZDLGNBQWE7QUFBQTtBQUFBO0FBQUE7QUFBQSxNQUlYLFNBQVM7QUFBQSxRQUNQLE9BQU87QUFBQSxVQUNMLFdBQWdCLGNBQVEsa0NBQVcsT0FBTyxlQUFlLGFBQWE7QUFBQSxVQUN0RSxVQUFlLGNBQVEsa0NBQVcsT0FBTyxjQUFjLG1CQUFtQjtBQUFBLFVBQzFFLGlCQUFzQixjQUFRLGtDQUFXLG1CQUFtQjtBQUFBLFVBQzVELGlCQUFzQixjQUFRLGtDQUFXLE9BQU8scUJBQXFCLFVBQVU7QUFBQSxVQUMvRSx3QkFBNkIsY0FBUSxrQ0FBVyxVQUFVO0FBQUEsUUFDNUQ7QUFBQSxNQUNGO0FBQUEsTUFDQSxjQUFjO0FBQUEsUUFDWixTQUFTLENBQUMsdUJBQXVCLGlCQUFpQixrQkFBa0IsaUJBQWlCO0FBQUEsTUFDdkY7QUFBQSxNQUNBLE9BQU87QUFBQSxRQUNMLFdBQVcsU0FBUyxhQUFhO0FBQUEsTUFDbkM7QUFBQSxNQUNBLFFBQVE7QUFBQSxRQUNOLE1BQU07QUFBQSxNQUNSO0FBQUEsTUFDQTtBQUFBLElBQ0YsQ0FBQztBQUFBLEVBQ0g7QUFDRjsiLAogICJuYW1lcyI6IFsicGF0aCIsICJkZWZpbmVDb25maWciLCAibG9hZEVudiIsICJ2aXRlX2NvbmZpZ19kZWZhdWx0IiwgImxvYWRFbnYiLCAiZGVmaW5lQ29uZmlnIl0KfQo=
