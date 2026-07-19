import StatusChip from "./StatusChip";
import { LockIcon } from "./icons";

export default function LockedOverlay({ onUnlockClick }: { onUnlockClick?: () => void }) {
  return (
    <div className="absolute inset-0 -m-1 flex flex-col items-center justify-center gap-3 rounded-2xl bg-paper/85 backdrop-blur-sm">
      <StatusChip toon="accent">Premium</StatusChip>
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-white">
        <LockIcon className="h-4 w-4" />
      </div>
      <p className="max-w-xs text-center text-sm text-ink/60">Dit onderdeel is te zien in het volledige rapport.</p>
      {onUnlockClick && (
        <button
          type="button"
          onClick={onUnlockClick}
          className="rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
        >
          Ontgrendel volledig rapport
        </button>
      )}
    </div>
  );
}
