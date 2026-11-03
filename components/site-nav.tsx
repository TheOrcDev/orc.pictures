import { GitHubStars } from "@/components/github-stars";
import { RaycastInstall } from "@/components/raycast-install";
import { GITHUB_REPO, getStargazersCount } from "@/lib/github";

const SiteNav = async () => {
  const stargazersCount = await getStargazersCount();

  return (
    <nav className="fixed top-4 right-4 z-20 flex items-center gap-2">
      <GitHubStars repo={GITHUB_REPO} stargazersCount={stargazersCount} />
      <RaycastInstall />
    </nav>
  );
};

export { SiteNav };
