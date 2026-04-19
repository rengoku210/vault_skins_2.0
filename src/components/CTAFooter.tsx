import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export function CTAFooter() {
  return (
    <section className="relative overflow-hidden px-6 py-32 md:px-10">
      <div className="pointer-events-none absolute inset-0 bg-radial-glow opacity-60" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-[140px]" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative mx-auto max-w-3xl text-center"
      >
        <p className="font-display text-[11px] uppercase tracking-[0.4em] text-primary/80">
          Join the Vault
        </p>
        <h2 className="mt-4 font-display text-5xl font-semibold tracking-tight text-balance md:text-7xl">
          Ready to enter the <span className="text-gradient-primary">premium</span> tier?
        </h2>
        <p className="mt-6 text-muted-foreground md:text-lg">
          List your account in minutes. Rent or sell to a curated audience of collectors.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/marketplace/new"
            className="rounded-full bg-primary px-8 py-3.5 text-sm font-medium uppercase tracking-[0.2em] text-primary-foreground shadow-glow transition hover:scale-[1.02]"
          >
            Create Listing
          </Link>
          <Link
            to="/marketplace"
            className="rounded-full border border-border/60 bg-foreground/[0.03] px-8 py-3.5 text-sm font-medium uppercase tracking-[0.2em] text-foreground backdrop-blur transition hover:border-primary/60 hover:text-primary"
          >
            Browse Marketplace
          </Link>
        </div>
      </motion.div>

      <footer className="relative mx-auto mt-32 max-w-7xl border-t border-border/40 pt-8 text-center">
        <p className="font-display text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
          VaultSkins · Premium Demo Marketplace · Not affiliated with Riot Games
        </p>
      </footer>
    </section>
  );
}
