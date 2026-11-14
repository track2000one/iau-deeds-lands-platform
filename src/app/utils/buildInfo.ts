/** Immutable build metadata compiled into the currently running frontend. */
export type ReleaseBuildInfo = {
  id: string;
  builtAt: string;
  commit: string;
};

declare const __IAU_BUILD_INFO__: ReleaseBuildInfo;

export const BUILD_INFO: ReleaseBuildInfo = __IAU_BUILD_INFO__;
