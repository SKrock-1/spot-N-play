import { useEffect } from 'react';
import { X, ShieldAlert, Users, Eye, IdCard, ClipboardList, Ticket, Crown, Shirt, Megaphone, HeartPulse, Waves, AlertTriangle, Droplets, Utensils, PawPrint, Lock, Landmark, Ban } from 'lucide-react';

const RuleItem = ({ icon: Icon, title, children }) => (
  <div className="flex gap-3 py-3 border-b border-black/5 dark:border-white/5 last:border-0">
    <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
      <Icon size={14} className="text-green-600" />
    </div>
    <div className="min-w-0">
      <p className="text-xs font-bold text-gray-900 dark:text-white">{title}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{children}</p>
    </div>
  </div>
);

export default function PoolRules({ open, onClose }) {
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
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/5 shrink-0 bg-gradient-to-r from-green-500/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-500 flex items-center justify-center text-white"><Waves size={16} /></div>
            <div>
              <h3 className="font-bebas text-lg tracking-wide">Pool Rules & Regulations</h3>
              <p className="text-xs text-gray-500">Please read carefully before booking. Management reserves all rights.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5"><X size={16} /></button>
        </div>

        <div className="overflow-y-auto px-5 py-2" style={{ scrollbarWidth: 'thin' }}>
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2.5 mb-4 flex gap-2">
            <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">By booking you agree to follow all pool rules, coach/lifeguard instructions and government/police directives. Violation may lead to immediate cancellation of membership without refund.</p>
          </div>

          <RuleItem icon={Eye} title="Visitors & Parents">Visitors and parents are not allowed on the swimming pool deck.</RuleItem>
          <RuleItem icon={Lock} title="Valuables">No person shall keep any valuable / watch / purse on the deck. If they do so, it is at their own risk.</RuleItem>
          <RuleItem icon={IdCard} title="Entry — Valid Identity Card Only">Entry to the swimming pool is only for members holding a valid Identity Card at the allotted time slot / shift.</RuleItem>
          <RuleItem icon={ClipboardList} title="Registration at Entry Gate">Every member must register their name and membership number in the register kept at the entry gate.</RuleItem>
          <RuleItem icon={Ticket} title="Pass Holders — Allotted Shift Only">Pass holders are allowed to swim and use the pool only during the allotted shift and session indicated on their Identity Card.</RuleItem>
          <RuleItem icon={Crown} title="Termination of Permission">Management may terminate a member&apos;s permission to use the swimming pool at any time without assigning any reason.</RuleItem>
          <RuleItem icon={Shirt} title="Swimming Attire">All swimmers must wear proper swimming costumes. A swimming cap is compulsory for persons with long hair.</RuleItem>
          <RuleItem icon={Megaphone} title="Instructions — Coach / Lifeguard Authority">All instructions issued by the In-charge / Coach / Lifeguard must be strictly followed. Coaches / Lifeguards are authorized to refuse entry / swimming to anyone who misbehaves or infringes the rules.</RuleItem>
          <RuleItem icon={ShieldAlert} title="Risk & Liability — At Your Own Risk">Any injury or loss of life during the swimming period is at the user&apos;s own risk. Management accepts no responsibility for accidents, and no compensation or claim will be entertained in case of mishap or loss of life during the swimming period.</RuleItem>

          <div className="py-3 border-b border-black/5 dark:border-white/5">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0"><Waves size={14} className="text-red-500" /></div>
              <div className="flex-1">
                <p className="text-xs font-bold text-gray-900 dark:text-white">Non-swimmers / Beginners</p>
                <ul className="mt-2 space-y-1.5 text-xs text-gray-500 dark:text-gray-400 leading-relaxed list-none">
                  <li><span className="font-semibold text-gray-700 dark:text-gray-300">(a)</span> Non-swimmers / beginners must not cross the barrier restricting access to the deeper portion of the pool.</li>
                  <li><span className="font-semibold text-gray-700 dark:text-gray-300">(b)</span> Violating this restriction is at the person&apos;s own risk, and their membership will stand cancelled with immediate effect.</li>
                  <li><span className="font-semibold text-gray-700 dark:text-gray-300">(c)</span> Wearing a <span className="font-semibold text-red-500">red cap is compulsory</span>.</li>
                </ul>
              </div>
            </div>
          </div>

          <RuleItem icon={HeartPulse} title="Health Restrictions">Anyone suffering from skin disease, open wounds, cough, cold, or communicable disease is not allowed to enter the swimming pool.</RuleItem>
          <RuleItem icon={Droplets} title="Shower Before Entry">All users must take a shower before entering the pool.</RuleItem>
          <RuleItem icon={Utensils} title="Food Not Allowed">No eatables are allowed in the swimming pool deck area.</RuleItem>
          <RuleItem icon={PawPrint} title="Pets Not Allowed">Pets are not allowed on the swimming pool premises.</RuleItem>
          <RuleItem icon={Lock} title="Pool Closure">Management can close the pool on any day without assigning any reason and without compensation.</RuleItem>
          <RuleItem icon={Landmark} title="Government / Police Rules Binding">Rules and instructions issued by the Government and police are binding on all members.</RuleItem>
          <RuleItem icon={Ban} title="Diving Not Allowed">Diving is not allowed.</RuleItem>

          <div className="mt-4 rounded-xl border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] p-3">
            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">Tip: Keep your Identity Card, proper costume and cap ready, arrive 10 minutes before your slot, register at the gate, shower, and follow the lifeguard&apos;s lane/barrier instructions. Red cap for non-swimmers/beginners.</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-black/5 dark:border-white/5 shrink-0 bg-black/[0.02] dark:bg-white/[0.02]">
          <button onClick={onClose} className="text-xs font-semibold px-4 py-2 rounded-xl bg-green-500 text-white hover:bg-green-600">I Understand</button>
        </div>
      </div>
    </div>
  );
}
