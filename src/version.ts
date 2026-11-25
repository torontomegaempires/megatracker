declare const __APP_VERSION__: string;
declare const __APP_COMMIT__: string;
declare const __APP_BUILT_AT__: string;

/** Semantic version from package.json, stamped in at build time. */
export const APP_VERSION = __APP_VERSION__;
/** Short git commit the build came from. */
export const APP_COMMIT = __APP_COMMIT__;
export const APP_BUILT_AT = __APP_BUILT_AT__;

/** e.g. "v0.1.0 (0f2801d)" */
export const versionLabel = `v${APP_VERSION} (${APP_COMMIT})`;
