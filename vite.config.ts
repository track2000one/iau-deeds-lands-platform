import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

// The metadata is frozen once for each build and shared by the embedded JS
// and the public, uncached release manifest.
const builtAt = new Date().toISOString();
const releaseInfo = {
  id: `build-${builtAt.replace(/[^0-9]/g, '')}`,
  builtAt,
  commit: (process.env.RAILWAY_GIT_COMMIT_SHA || process.env.GITHUB_SHA || '').slice(0, 12),
};

export default defineConfig({
  define: {
    __IAU_BUILD_INFO__: JSON.stringify(releaseInfo),
  },
  base: './',
  plugins: [
    {
      name: 'iau-release-manifest',
      apply: 'build',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'build-info.json',
          source: JSON.stringify(releaseInfo),
        });
      },
    },
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
