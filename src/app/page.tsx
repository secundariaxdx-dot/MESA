"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMesa } from "@/store/mesa";
import { Splash } from "@/components/layout/AppShell";

export default function Home() {
  const hydrated = useMesa((s) => s.hydrated);
  const done = useMesa((s) => s.onboardingDone);
  const router = useRouter();
  useEffect(() => {
    if (hydrated) router.replace(done ? "/semana" : "/bienvenida");
  }, [hydrated, done, router]);
  return <Splash />;
}
