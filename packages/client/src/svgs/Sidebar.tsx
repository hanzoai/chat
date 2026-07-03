// Canonical Hanzo sidebar-toggle glyph: lucide `PanelLeft`.
// Unified across hanzo.chat, hanzo.app, and hanzo console so the open/close
// affordance is the SAME icon (same 24x24 box, stroke-2, round caps) everywhere.
// Kept as the local `Sidebar` export so every call site (OpenSidebar, NewChat,
// ExpandedPanel) renders the canonical glyph with no churn.
export default function Sidebar({ className }: { className?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9 3v18" />
    </svg>
  );
}
