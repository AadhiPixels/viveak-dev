import { NotFoundView } from "@/components/layout/NotFoundView";

/** Boundary for notFound() thrown inside the site group, e.g. an unknown case study. */
export default function SiteNotFound() {
  return <NotFoundView />;
}
