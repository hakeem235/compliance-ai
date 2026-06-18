"use client";

import { ChevronDown } from "lucide-react";

export function OrgSwitcher() {
  return (
    <button className="mx-3.5 mb-2 flex items-center gap-[9px] rounded-[10px] bg-white/5 px-[11px] py-[9px] text-start transition-colors hover:bg-white/[0.09]">
      <div className="flex size-[26px] flex-none items-center justify-center rounded-[7px] bg-[#234C3D] text-[11px] font-bold text-[#9FE6C4]">
        NS
      </div>
      <div className="min-w-0 flex-1 leading-[1.15]">
        <div className="truncate text-[12.5px] font-semibold">Najd Solutions</div>
        <div className="text-[10px] text-sidebar-foreground-muted">Growth Plan</div>
      </div>
      <ChevronDown className="size-[13px] flex-none opacity-40" />
    </button>
  );
}
