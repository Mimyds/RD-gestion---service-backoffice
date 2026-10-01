import type { Metadata } from "next";
import { LettersView } from "@/components/workspace-views";

export const metadata: Metadata = { title: "Courriers" };

export default function LettersPage() {
  return <LettersView/>;
}
