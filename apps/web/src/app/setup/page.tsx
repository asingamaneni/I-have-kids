import Image from "next/image";
import Link from "next/link";
import { SetupForm } from "@/components/SetupForm";

export default function SetupPage() {
  return <main className="setup-page"><nav className="landing-nav"><Link className="landing-brand" href="/"><Image src="/icon.svg" width={36} height={36} alt="" priority />Learning Worktable</Link></nav><div className="setup-layout"><section><p className="hero-tag">Private, capability-based learning</p><h1>Start with the child, not the grade.</h1><p>Share what you already see them doing. The app starts with a short diagnostic near that point—or with concrete counting when you are unsure—and changes the path only from confirmed work.</p></section><SetupForm /></div></main>;
}
