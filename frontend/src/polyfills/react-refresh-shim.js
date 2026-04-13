// React Refresh Runtime shim for web
// This file is loaded before any other code via Metro polyfills
(function() {
  if (typeof window !== 'undefined') {
    // Create a mock ReactRefreshRuntime if it doesn't exist
    window.__ReactRefreshRuntime = window.__ReactRefreshRuntime || {
      injectIntoGlobalHook: function(globalObject) {
        // No-op for web
      },
      register: function(type, id) {
        // No-op
      },
      createSignatureFunctionForTransform: function() {
        return function() {};
      },
    };
  }
})();
