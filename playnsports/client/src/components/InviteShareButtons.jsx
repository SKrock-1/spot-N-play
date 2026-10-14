import { useState } from 'react';

// The ONE place invite sharing lives, so wallet, dashboard and profile all
// share the same message, the same working link, and the same behavior.
//  - Native share sheet first (mobile: WhatsApp, Telegram, SMS… in one tap)
//  - WhatsApp deep link always (desktop opens WhatsApp Web picker)
//  - Copy link as the universal fallback
export const buildInviteText = ({ code, link, inviterName, signupBonus = 20 }) =>
  `🏏 ${inviterName || 'Your friend'} invited you to PLAY N SPORTS! Sign up with code ${code} and get ${signupBonus} Fitcoin FREE. ${link}`;

export default function InviteShareButtons({ code, link, inviterName, signupBonus = 20, compact = false, onShared }) {
  const [copied, setCopied] = useState(false);
  const text = buildInviteText({ code, link, inviterName, signupBonus });
  const waHref = `https://wa.me/?text=${encodeURIComponent(text)}`;
  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  const flashCopied = () => {
    setCopied(true);
    onShared?.('copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link || text);
      flashCopied();
    } catch {
      // Clipboard unavailable (old browser / permissions) — select fallback
      window.prompt('Copy your invite link:', link || text);
    }
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title: 'PLAY N SPORTS invite', text });
      onShared?.('shared');
    } catch {
      // User dismissed the sheet — not an error, do nothing.
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        {canNativeShare && (
          <button onClick={nativeShare} title="Share invite" className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-green-400 text-black">📤 Share</button>
        )}
        <a href={waHref} target="_blank" rel="noopener noreferrer" title="Share on WhatsApp" className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-green-400/15 border border-green-400/25 text-green-400">WhatsApp</a>
        <button onClick={copyLink} title="Copy invite link" className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-black/5 dark:bg-white/10">
          {copied ? '✓ Copied' : 'Copy link'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 p-3">
        <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-1">Message preview</p>
        <p className="text-xs leading-relaxed">{text}</p>
      </div>
      {canNativeShare && (
        <button onClick={nativeShare} className="w-full bg-green-400 hover:bg-green-300 text-black font-bold py-3 rounded-xl">
          📤 Share invite
        </button>
      )}
      <div className="flex gap-2">
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className={`${canNativeShare ? 'flex-1' : 'w-full'} text-center border border-green-400/30 bg-green-400/10 hover:bg-green-400/20 text-green-400 font-bold py-3 rounded-xl`}
        >
          Share on WhatsApp
        </a>
        {!canNativeShare && (
          <button onClick={copyLink} className="flex-1 border border-black/10 dark:border-white/10 rounded-xl py-3 text-sm font-bold hover:border-green-400/40">
            {copied ? '✓ Link copied' : '🔗 Copy link'}
          </button>
        )}
      </div>
      {canNativeShare && (
        <button onClick={copyLink} className="text-xs text-gray-500 font-bold hover:underline">
          {copied ? '✓ Link copied' : 'or copy the link'}
        </button>
      )}
    </div>
  );
}
