import type { Metadata } from "next";
import { BlogAdmin } from "@/components/blog-admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog Publisher",
  robots: { index: false, follow: false },
};

export default function BlogAdminPage() {
  return <BlogAdmin />;
}
