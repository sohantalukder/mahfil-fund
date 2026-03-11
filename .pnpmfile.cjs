/**
 * .pnpmfile.cjs
 *
 * Turbo 2.x resolves the package manager binary from each package's own
 * node_modules/.bin/ directory. In a pnpm workspace, pnpm is only installed
 * at the root by default. This hook injects pnpm as a devDependency into
 * every @mahfil/* workspace package so that turbo can find it locally.
 */
function readPackage(pkg) {
  if (pkg.name && pkg.name.startsWith('@mahfil/')) {
    pkg.devDependencies = pkg.devDependencies || {};
    pkg.devDependencies['pnpm'] = '^10.32.0';
  }
  return pkg;
}

module.exports = {
  hooks: {
    readPackage,
  },
};
