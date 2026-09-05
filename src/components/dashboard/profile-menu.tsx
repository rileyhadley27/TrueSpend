"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Check,
  ChevronDown,
  CircleUserRound,
  Landmark,
  LogOut,
  Monitor,
  Moon,
  Settings,
  ShieldCheck,
  Sun,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type Theme, useTheme } from "@/components/theme/theme-provider";
import type { Account } from "@/lib/finance/types";
import { createClient } from "@/lib/supabase/client";

const themeOptions: Array<{
  value: Theme;
  label: string;
  icon: typeof Sun;
}> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function ProfileMenu({
  userName,
  userEmail,
  isAdmin,
  demoMode,
  accounts,
  onConnectAccount,
}: {
  userName: string;
  userEmail: string;
  isAdmin: boolean;
  demoMode: boolean;
  accounts: Account[];
  onConnectAccount: () => void;
}) {
  const { theme, setTheme } = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  async function handleSignOut() {
    setSigningOut(true);
    setSignOutError("");
    const { error } = await createClient().auth.signOut({ scope: "local" });
    if (error) {
      setSignOutError(error.message);
      setSigningOut(false);
      return;
    }
    window.location.replace("/auth");
  }

  function connectAccount() {
    setSettingsOpen(false);
    onConnectAccount();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Open account menu"
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#1B2A41] px-2 py-1.5 text-sm font-semibold text-white outline-none transition hover:bg-[#243753] focus-visible:ring-3 focus-visible:ring-[#3B82F6]/40"
        >
          <span className="grid size-7 place-items-center rounded-lg bg-[#3B82F6] text-xs font-bold text-white">
            {userName.slice(0, 2).toUpperCase()}
          </span>
          <span className="hidden sm:inline">{userName}</span>
          <ChevronDown className="size-3.5 text-[#94A3B8]" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={10}
          className="w-[min(21rem,calc(100vw-1.5rem))] rounded-2xl p-2 shadow-[0_24px_70px_rgba(10,15,30,.24)]"
        >
          <DropdownMenuLabel className="flex items-center gap-3 px-2 py-2.5">
            <span className="grid size-10 place-items-center rounded-xl bg-[#E8F1FF] text-sm font-bold text-[#2563EB] dark:bg-[#3B82F6]/15 dark:text-[#93C5FD]">
              {userName.slice(0, 2).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-foreground">
                {userName}
              </span>
              <span className="block truncate text-xs font-normal text-muted-foreground">
                {userEmail || "No email on file"}
              </span>
            </span>
            {isAdmin && (
              <Badge className="border-0 bg-[#E8F1FF] text-[#2563EB] dark:bg-[#3B82F6]/15 dark:text-[#93C5FD]">
                Admin
              </Badge>
            )}
          </DropdownMenuLabel>

          <DropdownMenuSeparator />
          <DropdownMenuLabel className="px-2 pt-2 uppercase tracking-[.12em]">
            Account
          </DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => setSettingsOpen(true)}
            className="px-2 py-2.5"
          >
            <Settings />
            Account settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onConnectAccount} className="px-2 py-2.5">
            <Landmark />
            Connect accounts
            <span className="ml-auto text-xs text-muted-foreground">
              {accounts.length}
            </span>
          </DropdownMenuItem>
          {isAdmin && (
            <DropdownMenuItem
              render={<Link href="/admin" />}
              className="px-2 py-2.5"
            >
              <ShieldCheck />
              Pending approvals
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuLabel className="px-2 pt-2 uppercase tracking-[.12em]">
            Appearance
          </DropdownMenuLabel>
          <div className="grid grid-cols-3 gap-1 p-1" aria-label="Color theme">
            {themeOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                closeOnClick={false}
                onClick={() => setTheme(option.value)}
                className={`flex-col justify-center gap-1.5 px-2 py-2.5 text-xs ${theme === option.value ? "bg-[#E8F1FF] text-[#1D4ED8] dark:bg-[#3B82F6]/15 dark:text-[#BFDBFE]" : "text-muted-foreground"}`}
              >
                <option.icon className="size-4" />
                {option.label}
                {theme === option.value && (
                  <Check className="absolute right-1.5 top-1.5 size-3" />
                )}
              </DropdownMenuItem>
            ))}
          </div>

          {!demoMode && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                disabled={signingOut}
                onClick={() => void handleSignOut()}
                className="px-2 py-2.5"
              >
                <LogOut />
                {signingOut ? "Signing out…" : "Sign out"}
              </DropdownMenuItem>
              {signOutError && (
                <p className="px-2 pb-1 text-xs text-destructive" role="alert">
                  {signOutError}
                </p>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="rounded-3xl p-6 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Account settings
            </DialogTitle>
            <DialogDescription>
              Your Divvy profile, access, connected accounts, and appearance.
            </DialogDescription>
          </DialogHeader>

          <section className="mt-2 rounded-2xl border bg-muted/35 p-4">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-[#1B2A41] text-sm font-bold text-white">
                {userName.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{userName}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {userEmail || "No email on file"}
                </p>
              </div>
              <Badge variant="outline">
                <CircleUserRound /> {isAdmin ? "Administrator" : "Member"}
              </Badge>
            </div>
          </section>

          <section className="mt-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold">Connected accounts</h3>
                <p className="text-xs text-muted-foreground">
                  Accounts available in this workspace
                </p>
              </div>
              <Button size="sm" onClick={connectAccount}>
                <Landmark /> Connect
              </Button>
            </div>
            <div className="mt-3 max-h-44 space-y-2 overflow-auto">
              {accounts.length ? (
                accounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center gap-3 rounded-xl border bg-background/60 px-3 py-2.5"
                  >
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: account.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {account.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {account.institution}
                        {account.last4 ? ` · •••• ${account.last4}` : ""}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
                  No accounts connected yet.
                </p>
              )}
            </div>
          </section>

          <section className="mt-2 border-t pt-4">
            <h3 className="font-bold">Color theme</h3>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {themeOptions.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={theme === option.value ? "default" : "outline"}
                  onClick={() => setTheme(option.value)}
                  className="h-auto flex-col gap-1.5 py-3"
                >
                  <option.icon />
                  {option.label}
                </Button>
              ))}
            </div>
          </section>
        </DialogContent>
      </Dialog>
    </>
  );
}
