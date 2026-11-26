/**
 * Resolves the latest Android beta APK from the deplo.ai.mobile repo's
 * GitHub Releases. The release workflow there (.github/workflows/
 * android-apk-release.yml) publishes a new release on every push, naming
 * the asset deplo-android-<short-sha>.apk and marking the release "latest"
 * only when the push was to main — so GitHub's own /releases/latest
 * endpoint already tracks the current stable build for us; we just need to
 * pull whichever .apk asset is attached to it.
 *
 * Fetched server-side with an hourly revalidation window, so this is at
 * most one unauthenticated GitHub API call per hour regardless of visitor
 * traffic — nowhere near the 60/hour unauthenticated rate limit.
 */

const MOBILE_REPO = "Taj-2005/deplo.ai.mobile";

/** Used only if the GitHub API is unreachable or the shape is unexpected. */
const FALLBACK_APK_URL =
  "https://github.com/Taj-2005/deplo.ai.mobile/releases/download/android-main-cf821b6/deplo-android-cf821b6.apk";

interface GithubReleaseAsset {
  name: string;
  browser_download_url: string;
}

interface GithubRelease {
  tag_name: string;
  assets: GithubReleaseAsset[];
}

export async function getLatestAndroidApkUrl(): Promise<string> {
  try {
    const res = await fetch(`https://api.github.com/repos/${MOBILE_REPO}/releases/latest`, {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return FALLBACK_APK_URL;

    const release = (await res.json()) as GithubRelease;
    const apkAsset = release.assets?.find((asset) => asset.name.endsWith(".apk"));
    return apkAsset?.browser_download_url ?? FALLBACK_APK_URL;
  } catch {
    return FALLBACK_APK_URL;
  }
}
