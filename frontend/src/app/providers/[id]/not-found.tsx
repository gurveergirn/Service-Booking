import { UserX } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container-page py-16">
      <EmptyState icon={UserX} title="Provider not found" description="This profile may have been removed.">
        <Link href="/providers" className={buttonVariants()}>
          Browse providers
        </Link>
      </EmptyState>
    </div>
  );
}
