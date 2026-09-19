const SPORT_EMOJI = { football: '⚽', cricket: '🏏', basketball: '🏀', tennis: '🎾', badminton: '🏸', volleyball: '🏐', boxing: '🥊', hockey: '🏑', kabaddi: '🤼', 'kho kho': '🏃', pickleball: '🏓', 'table tennis': '🏓', squash: '🎾', handball: '🤾', futsal: '⚽', rugby: '🏉', athletics: '🏃', wrestling: '🤼', weightlifting: '🏋️', yoga: '🧘', skating: '⛸️', chess: '♟️', carrom: '🎯', archery: '🏹', shooting: '🎯', cycling: '🚴', 'box cricket': '🏏', 'box football': '⚽', esports: '🎮' };

const LEVEL_CLASS = {
  beginner: 'up-badge up-badge-beg',
  intermediate: 'up-badge up-badge-int',
  advanced: 'up-badge up-badge-adv',
};

const ProfileSports = ({ playerProfile }) => {
  if (!playerProfile) return null;

  const sports = playerProfile.sports || [];
  const achievements = playerProfile.achievements || [];
  const certs = playerProfile.certificates || [];

  const hasSomething = sports.length || achievements.length || certs.length;
  if (!hasSomething) return null;

  return (
    <div className="flex flex-col gap-4 up-anim3">

      {/* Sports */}
      {sports.length > 0 && (
        <div className="up-card">
          <p className="up-section-label">Sports</p>
          <div className="flex flex-col gap-2">
            {sports.map((s, i) => (
              <div key={i} className="up-sport-chip">
                <span style={{ fontSize: 22, flexShrink: 0 }}>{SPORT_EMOJI[s.name] || '🏅'}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-gray-900 dark:text-white font-semibold text-sm capitalize">{s.name}</p>
                  {s.yearsPlayed > 0 && (
                    <p style={{ fontSize: 11, color: '#6b7280' }}>{s.yearsPlayed} yr{s.yearsPlayed !== 1 ? 's' : ''}</p>
                  )}
                </div>
                <span className={LEVEL_CLASS[s.level] || 'up-badge'}>
                  {s.level}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Achievements */}
      {achievements.length > 0 && (
        <div className="up-card">
          <p className="up-section-label">Achievements</p>
          <div className="flex flex-col gap-2">
            {achievements.map((a, i) => (
              <div key={i} className="up-achievement">
                <span style={{ flexShrink: 0 }}>🏅</span>
                <span>{a}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certificates */}
      {certs.length > 0 && (
        <div className="up-card">
          <p className="up-section-label">Certificates ({certs.length})</p>
          <div className="flex flex-col gap-2">
            {certs.map((c) => (
              <div key={c._id} className="up-cert-card">
                <div className="flex items-center gap-3 min-w-0">
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                  }}>
                    {c.fileUrl?.includes('.pdf') ? '📄' : '🖼️'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-gray-900 dark:text-white text-sm font-semibold truncate">{c.title}</p>
                    <p style={{ fontSize: 11, color: '#6b7280' }}>
                      {new Date(c.uploadedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <a
                  href={c.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 10,
                    background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)',
                    color: '#60a5fa', flexShrink: 0, textDecoration: 'none', whiteSpace: 'nowrap',
                    transition: 'all 0.2s',
                  }}
                >
                  View
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileSports;
