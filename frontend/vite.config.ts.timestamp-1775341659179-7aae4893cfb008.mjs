// vite.config.ts
import { defineConfig } from "file:///C:/Users/LENOVO/Desktop/Vanguard/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/LENOVO/Desktop/Vanguard/frontend/node_modules/@vitejs/plugin-react/dist/index.js";
import cesium from "file:///C:/Users/LENOVO/Desktop/Vanguard/frontend/node_modules/vite-plugin-cesium/dist/index.mjs";
var vite_config_default = defineConfig({
  plugins: [react(), cesium()],
  optimizeDeps: {
    include: ["cesium"]
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3333",
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.setHeader("Accept", "text/event-stream");
          });
          proxy.on("error", (err, _req, res) => {
            const msg = err.message ?? "";
            if (msg.includes("ECONNREFUSED") || err.constructor?.name === "AggregateError") {
              if (res && "writeHead" in res && typeof res.writeHead === "function") {
                res.writeHead(503, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Backend starting up, please wait\u2026" }));
              }
            } else {
              console.error("[vite proxy]", err.message);
            }
          });
        }
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxMRU5PVk9cXFxcRGVza3RvcFxcXFxWYW5ndWFyZFxcXFxmcm9udGVuZFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcTEVOT1ZPXFxcXERlc2t0b3BcXFxcVmFuZ3VhcmRcXFxcZnJvbnRlbmRcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL0xFTk9WTy9EZXNrdG9wL1Zhbmd1YXJkL2Zyb250ZW5kL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCdcbmltcG9ydCBjZXNpdW0gZnJvbSAndml0ZS1wbHVnaW4tY2VzaXVtJ1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbcmVhY3QoKSwgY2VzaXVtKCldLFxuICBvcHRpbWl6ZURlcHM6IHtcbiAgICBpbmNsdWRlOiBbJ2Nlc2l1bSddXG4gIH0sXG4gIHNlcnZlcjoge1xuICAgIHByb3h5OiB7XG4gICAgICAnL2FwaSc6IHtcbiAgICAgICAgdGFyZ2V0OiAnaHR0cDovL2xvY2FsaG9zdDozMzMzJyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICBjb25maWd1cmU6IChwcm94eSkgPT4ge1xuICAgICAgICAgIHByb3h5Lm9uKCdwcm94eVJlcScsIChwcm94eVJlcSkgPT4ge1xuICAgICAgICAgICAgcHJveHlSZXEuc2V0SGVhZGVyKCdBY2NlcHQnLCAndGV4dC9ldmVudC1zdHJlYW0nKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICAvLyBTdXBwcmVzcyBcImJhY2tlbmQgbm90IHJlYWR5IHlldFwiIGNvbm5lY3Rpb24gZXJyb3JzIGR1cmluZyBzdGFydHVwXG4gICAgICAgICAgcHJveHkub24oJ2Vycm9yJywgKGVyciwgX3JlcSwgcmVzKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBtc2cgPSBlcnIubWVzc2FnZSA/PyAnJztcbiAgICAgICAgICAgIGlmIChtc2cuaW5jbHVkZXMoJ0VDT05OUkVGVVNFRCcpIHx8IGVyci5jb25zdHJ1Y3Rvcj8ubmFtZSA9PT0gJ0FnZ3JlZ2F0ZUVycm9yJykge1xuICAgICAgICAgICAgICAvLyBCYWNrZW5kIHN0aWxsIHN0YXJ0aW5nIFx1MjAxNCBzZW5kIGEgY2xlYW4gNTAzIGluc3RlYWQgb2YgY3Jhc2hpbmcgdGhlIHByb3h5XG4gICAgICAgICAgICAgIGlmIChyZXMgJiYgJ3dyaXRlSGVhZCcgaW4gcmVzICYmIHR5cGVvZiAocmVzIGFzIGFueSkud3JpdGVIZWFkID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgKHJlcyBhcyBhbnkpLndyaXRlSGVhZCg1MDMsIHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9KTtcbiAgICAgICAgICAgICAgICAocmVzIGFzIGFueSkuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdCYWNrZW5kIHN0YXJ0aW5nIHVwLCBwbGVhc2Ugd2FpdFx1MjAyNicgfSkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbdml0ZSBwcm94eV0nLCBlcnIubWVzc2FnZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn0pIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF5VCxTQUFTLG9CQUFvQjtBQUN0VixPQUFPLFdBQVc7QUFDbEIsT0FBTyxZQUFZO0FBRW5CLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDO0FBQUEsRUFDM0IsY0FBYztBQUFBLElBQ1osU0FBUyxDQUFDLFFBQVE7QUFBQSxFQUNwQjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sT0FBTztBQUFBLE1BQ0wsUUFBUTtBQUFBLFFBQ04sUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsV0FBVyxDQUFDLFVBQVU7QUFDcEIsZ0JBQU0sR0FBRyxZQUFZLENBQUMsYUFBYTtBQUNqQyxxQkFBUyxVQUFVLFVBQVUsbUJBQW1CO0FBQUEsVUFDbEQsQ0FBQztBQUVELGdCQUFNLEdBQUcsU0FBUyxDQUFDLEtBQUssTUFBTSxRQUFRO0FBQ3BDLGtCQUFNLE1BQU0sSUFBSSxXQUFXO0FBQzNCLGdCQUFJLElBQUksU0FBUyxjQUFjLEtBQUssSUFBSSxhQUFhLFNBQVMsa0JBQWtCO0FBRTlFLGtCQUFJLE9BQU8sZUFBZSxPQUFPLE9BQVEsSUFBWSxjQUFjLFlBQVk7QUFDN0UsZ0JBQUMsSUFBWSxVQUFVLEtBQUssRUFBRSxnQkFBZ0IsbUJBQW1CLENBQUM7QUFDbEUsZ0JBQUMsSUFBWSxJQUFJLEtBQUssVUFBVSxFQUFFLE9BQU8seUNBQW9DLENBQUMsQ0FBQztBQUFBLGNBQ2pGO0FBQUEsWUFDRixPQUFPO0FBQ0wsc0JBQVEsTUFBTSxnQkFBZ0IsSUFBSSxPQUFPO0FBQUEsWUFDM0M7QUFBQSxVQUNGLENBQUM7QUFBQSxRQUNIO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
