import Link from 'next/link';

export function AuthFooter() {
  return (
    <footer className="absolute bottom-4 left-0 right-0 text-center text-sm text-muted-foreground">
      <div className="flex items-center justify-center gap-4">
        <Link
          href="/privacy-policy"
          className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
        >
          Privacy Policy
        </Link>
        <span>•</span>
        <Link
          href="/refund-policy"
          className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
        >
          Refund Policy
        </Link>
        <span>•</span>
        <Link
          href="/terms-and-conditions"
          className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
        >
          Terms & Conditions
        </Link>
      </div>
    </footer>
  );
}
