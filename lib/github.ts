export const GITHUB_REPO = "TheOrcDev/orc.pictures";

const STARS_REVALIDATE_SECONDS = 3600;

interface RepoResponse {
  stargazers_count?: number;
}

// Falls back to 0 so a GitHub outage or rate limit never breaks the layout.
export const getStargazersCount = async (): Promise<number> => {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}`,
      {
        headers: { Accept: "application/vnd.github+json" },
        next: { revalidate: STARS_REVALIDATE_SECONDS },
      }
    );
    if (!response.ok) {
      return 0;
    }
    // SAFETY: a 2xx from the GitHub repos endpoint is a repository object; a missing count still falls back to 0.
    const repo = (await response.json()) as RepoResponse;
    return repo.stargazers_count ?? 0;
  } catch {
    return 0;
  }
};
