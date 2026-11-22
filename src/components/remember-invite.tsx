"use client";
import { useEffect } from "react";
// Remembers the opened invitation link for 7 days, so that an account created a bit later
// (after an error, another page…) still sends the join request to this residence.
export function RememberInvite({ token }: { token: string }) {
  useEffect(() => {
    document.cookie = `syndic_invite=${encodeURIComponent("/rejoindre/" + token)};path=/;max-age=604800;samesite=lax;secure`;
  }, [token]);
  return null;
}
