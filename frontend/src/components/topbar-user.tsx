"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { UserButton, useAuth, useUser } from "@/components/auth";
import { api, type CurrentUser, type OrgUser } from "@/lib/api";

const ROLE_LABEL_KEY: Record<OrgUser["role"], string> = {
  owner: "businessOwner",
  legal_reviewer: "legalReviewer",
  member: "teamMember",
  admin: "admin",
};

export function TopbarUser() {
  const t = useTranslations("Settings");
  const { getToken } = useAuth();
  const { user } = useUser();
  const tokenFn = useCallback(() => getToken(), [getToken]);
  const [me, setMe] = useState<CurrentUser | null>(null);

  useEffect(() => {
    api.me
      .get(tokenFn)
      .then(setMe)
      .catch(() => {});
  }, [tokenFn]);

  const name = me?.name || user?.fullName || user?.primaryEmailAddress?.emailAddress || "";
  const role = me ? t(ROLE_LABEL_KEY[me.role]) : "";

  return (
    <div className="flex items-center gap-2.5 ps-1.5">
      <UserButton />
      <div className="leading-[1.15]">
        <div className="text-[12.5px] font-semibold">{name || "—"}</div>
        <div className="text-[10.5px] text-muted-foreground">{role}</div>
      </div>
    </div>
  );
}
