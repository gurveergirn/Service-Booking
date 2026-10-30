import type { Metadata } from "next";
import { Suspense } from "react";

import { AvailabilityManager } from "./availability-manager";

export const metadata: Metadata = { title: "Availability" };

export default function AvailabilityPage() {
  return (
    <Suspense>
      <AvailabilityManager />
    </Suspense>
  );
}
