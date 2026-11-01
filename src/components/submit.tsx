"use client";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
export function Submit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return <Button disabled={pending}>{pending ? "En cours…" : children}</Button>;
}
