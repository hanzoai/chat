const fs = require('fs-extra');

// vite.config.ts leaves publicDir off for the build so workbox globs dist before
// these files land and does not precache them. They are copied here instead —
// the whole directory, because an enumerated list is how favicon.svg sat in
// public/ while the web root answered 404 for it.
async function postBuild() {
  try {
    await fs.copy('public', 'dist');
    console.log('✅ public/ copied into dist/');
  } catch (err) {
    console.error('❌ Error copying public/ into dist/:', err);
    process.exit(1);
  }
}

postBuild();
