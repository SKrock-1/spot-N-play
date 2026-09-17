import { useEffect } from 'react';
import { X, Clock, Waves, CalendarDays, ListChecks, CheckCircle2, HeartPulse, FileText, Ticket, Users, ShieldCheck, Info, CreditCard, MapPin } from 'lucide-react';

const GuideStep = ({ n, title, desc, icon: Icon, children }) => (
  <div className="flex gap-3">
    <div className="flex flex-col items-center">
      <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold shrink-0">{n}</div>
      <div className="w-0.5 flex-1 bg-black/10 dark:bg-white/10 mt-1.5" />
    </div>
    <div className="flex-1 pb-6">
      <p className="text-sm font-bold flex items-center gap-1.5"><Icon size={13} className="text-green-500" /> {title}</p>
      <p className="text-xs text-gray-500 mt-1">{desc}</p>
      {children && <div className="mt-2">{children}</div>}
    </div>
  </div>
);

const Bullet = ({ children }) => (
  <li className="flex gap-2 text-xs text-gray-600 dark:text-gray-400"><span className="text-green-500 mt-0.5">•</span><span>{children}</span></li>
);

export default function PoolBookingGuide({ open, onClose, hourlyLabel, membershipLabel }) {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-white dark:bg-[#111] border border-black/10 dark:border-white/10 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/5 shrink-0">
          <div>
            <h3 className="font-bebas text-xl tracking-wide flex items-center gap-2"><Info size={16} className="text-green-500" /> How to Book — Full Guide</h3>
            <p className="text-xs text-gray-500">Plan your visit in under a minute. Hourly vs Membership.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5"><X size={16} /></button>
        </div>

        <div className="overflow-y-auto px-5 py-5 space-y-0" style={{ scrollbarWidth: 'thin' }}>
          {/* Quick chooser */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-3">
              <p className="text-xs font-bold flex items-center gap-1.5"><Clock size={12} className="text-green-500" /> Hourly — Pay per session</p>
              <p className="text-[11px] text-gray-500 mt-1">{hourlyLabel || '₹100–150 per session'} · Best for occasional swims. Pick any date & 50-min slot, pay per visit.</p>
            </div>
            <div className="rounded-xl border border-black/10 dark:border-white/10 p-3">
              <p className="text-xs font-bold flex items-center gap-1.5"><Waves size={12} className="text-green-500" /> Membership — Monthly / Semester / Package</p>
              <p className="text-[11px] text-gray-500 mt-1">{membershipLabel || '₹1,000–7,000 per plan'} · Best for regulars. Choose plan first, then slot — one plan covers the period.</p>
            </div>
          </div>

          <GuideStep n={1} title="Choose: Hourly or Membership" desc="At the very top of the form, pick how you want to pay. This opens a separate flow — Hourly is 3 steps, Membership is 4 steps, each optimised for its use-case." icon={Waves}>
            <ul className="space-y-1 mt-2">
              <Bullet><b>Hourly:</b> Date & Slot → Category (Hosteler / Day Scholar) → Confirm & Pay.</Bullet>
              <Bullet><b>Membership:</b> Plan (Monthly / Semester / Session Package) → Category → Date & Slot → Confirm & Pay. Separate flow so regulars aren't forced through per-session choices.</Bullet>
            </ul>
          </GuideStep>

          <GuideStep n={2} title="Pick date & slot" desc="Tap Today / Tomorrow / Day after, or open the calendar (up to 7 days ahead). Slots show General (blue) vs Girls Only (pink), spots left, and Expired / Fully booked states." icon={CalendarDays}>
            <ul className="space-y-1">
              <Bullet>Pool selector appears only if venue has 2 pools. <b>Tap any slot card</b> to continue — no extra Next button.</Bullet>
              <Bullet><b>Girls Only</b> slots show a pink confirm popup — “I understand, continue” is required.</Bullet>
              <Bullet>Slots expire when start time passes ( shows Expired). Fully booked = 0 spots left.</Bullet>
            </ul>
          </GuideStep>

          <GuideStep n={3} title="Pick category (who you are)" desc="Price is per swimmer: category price × swimmers + one-time registration if you're new." icon={ListChecks}>
            <ul className="space-y-1">
              <Bullet><b>Hourly:</b> 2 options — LPU Hosteler / Day Scholar (₹100 / ₹150 per session).</Bullet>
              <Bullet><b>Membership:</b> Monthly ₹1,000–2,000 · Semester ₹4,000–5,000 · Session Package ₹6,000–7,000 — each with Hosteler / Day Scholar (and Alumni / Outsider on some plans).</Bullet>
              <Bullet>Registration fee (₹200) added once if “I'm a new member”.</Bullet>
            </ul>
          </GuideStep>

          <GuideStep n={4} title="Confirm & Pay" desc="Set swimmers (1–7, +/− or type), health & safety tick, optional medical certificate, then Pay." icon={CheckCircle2}>
            <ul className="space-y-1">
              <Bullet><HeartPulse size={11} className="inline" /> <b>Health tick required</b> — “I am fit to swim …” must be checked or Pay stays disabled.</Bullet>
              <Bullet><FileText size={11} className="inline" /> Medical certificate optional — upload once, saved to your profile.</Bullet>
              <Bullet><Users size={11} className="inline" /> Party size clamped 1–7; price = category × partySize.</Bullet>
              <Bullet><CreditCard size={11} className="inline" /> Razorpay checkout (green theme). <b>Test booking</b> button in DEV only.</Bullet>
              <Bullet><Ticket size={11} className="inline" /> After pay: ticket + <b>QR</b> (from <code className="text-[10px] bg-black/5 dark:bg-white/5 px-1 py-0.5 rounded">GET /pools/my/qrs</code>). QR dies 30 min after slot end, single-use — screenshot blocked.</Bullet>
            </ul>
          </GuideStep>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 mt-1">
            <p className="text-xs font-bold flex items-center gap-1.5"><ShieldCheck size={12} className="text-amber-600" /> Tips to plan it</p>
            <ul className="space-y-1 mt-2">
              <Bullet>Book early — slots open 7 days out, popular evening slots fill fast.</Bullet>
              <Bullet>Bring ticket ID + QR; girls-only slots are entry-checked, no refund if mismatched.</Bullet>
              <Bullet>Owner sees bookings newest-first in Pool Dashboard → Bookings tab.</Bullet>
              <Bullet><MapPin size={11} className="inline" /> Your booking summary stays pinned on the right on desktop.</Bullet>
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-black/5 dark:border-white/5 shrink-0 bg-black/[0.02] dark:bg-white/[0.02]">
          <p className="text-[11px] text-gray-500">Questions? Contact venue support after booking.</p>
          <button onClick={onClose} className="text-xs font-semibold px-4 py-2 rounded-xl bg-green-500 text-white hover:bg-green-600">Got it</button>
        </div>
      </div>
    </div>
  );
}
