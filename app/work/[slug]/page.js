"use client";

import { useParams, useRouter } from "next/navigation";

export default function CaseStudy() {
  const { slug } = useParams();
  const router = useRouter();
  const title = slug.split("-").map((x) => x[0].toUpperCase() + x.slice(1)).join(" ");
  const goBack = (event) => {
    event.preventDefault();
    const navigate = () => router.push("/#work");
    if (document.startViewTransition) document.startViewTransition(navigate);
    else navigate();
  };
  return (
    <main className="case dark">
      <a href="/#work" onClick={goBack} className="case-back">← Back to work</a>
      <p className="eyebrow">Case study · In progress</p>
      <h1>{title}</h1>
      <div className="case-art"><span>Coming soon</span></div>
      <p className="case-note">The detailed case study is currently taking shape. The route and transition handoff are ready for the final Figma story.</p>
    </main>
  );
}
