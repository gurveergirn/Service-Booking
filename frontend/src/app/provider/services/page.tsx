import type { Metadata } from "next";
import { Suspense } from "react";

import { ServicesManager } from "./services-manager";

export const metadata: Metadata = { title: "Services" };

export default function ServicesPage() {
  return (
    <Suspense>
      <ServicesManager />
    </Suspense>
  );
}
