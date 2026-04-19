import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutDashboard, Shield } from "lucide-react";

export function SiteHeader() {
  const { user, signOut, loading, isAdmin } = useAuth();
  const navigate = useNavigate();

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `transition-colors hover:text-foreground ${isActive ? "text-foreground" : ""}`;

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary shadow-glow" />
          <span className="font-display text-sm font-semibold uppercase tracking-[0.25em] text-foreground">
            VaultSkins
          </span>
        </Link>

        <div className="hidden items-center gap-8 text-xs uppercase tracking-[0.2em] text-muted-foreground md:flex">
          <NavLink to="/marketplace" className={navClass}>Marketplace</NavLink>
          <NavLink to="/agents" className={navClass}>Agents</NavLink>
          <NavLink to="/skins" className={navClass}>Skins</NavLink>
          {user && <NavLink to="/dashboard" className={navClass}>Dashboard</NavLink>}
          {isAdmin && (
            <NavLink to="/admin" className={navClass}>
              <span className="inline-flex items-center gap-1.5"><Shield className="h-3 w-3" /> Admin</span>
            </NavLink>
          )}
        </div>

        <div className="flex items-center gap-3">
          {loading ? (
            <div className="h-8 w-20 animate-pulse rounded-full bg-foreground/5" />
          ) : user ? (
            <>
              <Link
                to="/marketplace/new"
                className="hidden rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-primary transition hover:bg-primary/20 sm:inline-block"
              >
                Sell Account
              </Link>
              <span className="hidden text-[11px] uppercase tracking-[0.2em] text-muted-foreground lg:inline">
                {user.email?.split("@")[0]}
              </span>
              <button
                onClick={async () => { await signOut(); navigate("/"); }}
                className="rounded-full border border-border/60 bg-foreground/[0.04] px-4 py-2 text-xs uppercase tracking-[0.2em] text-foreground transition hover:border-primary/60 hover:text-primary"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="rounded-full bg-primary px-4 py-2 text-xs uppercase tracking-[0.2em] text-primary-foreground shadow-glow transition hover:scale-[1.02]"
            >
              Enter Vault
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
