
"use client";

import { useEffect, use } from "react";
import { useRouter } from "next/navigation";

export default function RedundantControllerRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  useEffect(() => {
    router.replace(`/toycontrols/remote/${id}`);
  }, [router, id]);
  return null;
}
