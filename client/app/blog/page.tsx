import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { BLOG_POSTS, formatPostDate } from "@/lib/blog/posts";

export const metadata: Metadata = {
  title: "Blog",
  description: "Product announcements and engineering notes from the deplo.ai team.",
};

export default function BlogIndex() {
  return (
    <main className="bg-white min-h-screen">
      <Navbar />
      <div className="max-w-3xl mx-auto px-5 sm:px-8 pt-36 pb-24">
        <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[2px] text-[#94A3B8] mb-5">
          <span className="w-[5px] h-[5px] bg-[#94A3B8] inline-block rounded-full" />
          Blog
        </span>
        <h1
          className="text-black font-semibold tracking-[-0.04em] leading-[1.08] mb-12"
          style={{ fontSize: "clamp(2rem, 4.5vw, 2.75rem)" }}
        >
          Notes from the
          <br />
          <span className="text-[#94A3B8]">deployment layer.</span>
        </h1>

        <div className="flex flex-col border-t border-[#E2E8F0]">
          {BLOG_POSTS.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group py-8 border-b border-[#E2E8F0] flex flex-col gap-2"
            >
              <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[1.8px] text-[#94A3B8]">
                <span>{post.tag}</span>
                <span className="w-[3px] h-[3px] bg-[#CBD5E1] rounded-full" />
                <span className="font-medium normal-case tracking-normal text-[12px]">
                  {formatPostDate(post.date)} · {post.readMinutes} min read
                </span>
              </div>
              <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-black group-hover:underline decoration-[#CBD5E1] underline-offset-4">
                {post.title}
              </h2>
              <p className="text-[14px] leading-relaxed text-[#64748B] max-w-[60ch]">{post.description}</p>
              <span className="text-[13px] text-black mt-1">
                Read post <span className="inline-block group-hover:translate-x-0.5 transition-transform">→</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
      <Footer />
    </main>
  );
}
