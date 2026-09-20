import type { Metadata } from "next";
import DollarizationStory from "@/components/eggs/DollarizationStory";

export const metadata: Metadata = {
  title: "Ecuador's Inflation Rollercoaster",
  robots: { index: false, follow: false },
};

export default function DolarizacionPage() {
  return <DollarizationStory />;
}
