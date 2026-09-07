import { Separator } from "@/components/ui/separator";
import { ORCDEV_URL, SITE_NAME } from "@/lib/site";

const year = new Date().getFullYear();

const SiteFooter = () => (
  <footer>
    <Separator />
    <div className="text-muted-foreground mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-2 px-6 py-8 text-sm sm:flex-row">
      <p>
        © {year} {SITE_NAME}
      </p>
      <p>
        Made by{" "}
        <a
          className="text-foreground/70 hover:text-foreground underline underline-offset-4 transition-colors"
          href={ORCDEV_URL}
          rel="noreferrer"
          target="_blank"
        >
          OrcDev
        </a>{" "}
        with <span aria-hidden="true">🪓</span>
      </p>
    </div>
  </footer>
);

export { SiteFooter };
