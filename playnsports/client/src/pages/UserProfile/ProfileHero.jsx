import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../api/axios';
import ChallengeModal from '../../components/challenge/ChallengeModal';
import MateButton from '../../components/MateButton';

const ROLE_LABEL = {
  player: '⚽ Player',
  coach: '🎓 Coach',
  ground_owner: '🏟️ Ground Owner',
  admin: '🛡️ Admin',
};

const ROLE_CLASS = {
  player: 'up-role-player',
  coach: 'up-role-coach',
  ground_owner: 'up-role-owner',
  admin: 'up-role-admin',
};

const ProfileHero = ({ user, playerProfile, isOwnProfile, currentUserId }) => {
  const navigate = useNavigate();
  const [showChallenge, setShowChallenge] = useState(false);
  const [challengeSent, setChallengeSent] = useState(false);

  const handleMessage = async () => {
    try {
      const { data } = await API.post('/chat/direct', { userId: user._id });
      navigate(`/chat/${data._id}`);
    } catch {}
  };

  const sports = playerProfile?.sports || [];
  const achievements = playerProfile?.achievements || [];
  const certs = playerProfile?.certificates || [];

  return (
    <div className="up-card up-anim1">
      {/* Top row: avatar + name block */}
      <div className="flex items-start gap-5 flex-wrap">
        {/* Avatar */}
        <div className="up-avatar-ring">
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} className="up-avatar-img" />
          ) : (
            <div className="up-avatar-img flex items-center justify-center"
              style={{ background: 'rgba(74,222,128,0.08)' }}>
              <span style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 40, color: '#4ade80' }}>
                {user.name?.charAt(0)}
              </span>
            </div>
          )}
        </div>

        {/* Name / role / location */}
        <div className="flex-1 min-w-0 pt-1">
          <h1
            className="up-shimmer"
            style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 'clamp(28px, 5vw, 42px)', lineHeight: 1.1, marginBottom: 6 }}
          >
            {user.name}
          </h1>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className={ROLE_CLASS[user.role] || 'up-role-player'}>
              {ROLE_LABEL[user.role] || user.role}
            </span>
            {user.lpuVerified && (
              <span className="px-2.5 py-1 rounded-full border border-green-400/30 bg-green-400/10 text-green-500 text-xs font-bold">
                LPU Verified
              </span>
            )}
            {(user.city || user.state) && (
              <span style={{ fontSize: 12, color: '#6b7280' }}>
                📍 {[user.city, user.state].filter(Boolean).join(', ')}
              </span>
            )}
          </div>

          {user.bio && (
            <p style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.6, maxWidth: 480 }}>
              {user.bio}
            </p>
          )}
        </div>
      </div>

      {/* Stats row (player only) */}
      {user.role === 'player' && (
        <div className="flex gap-3 mt-5 flex-wrap">
          <div className="up-stat-box">
            <div className="up-stat-num">{sports.length || 0}</div>
            <div className="up-stat-label">Sports</div>
          </div>
          <div className="up-stat-box">
            <div className="up-stat-num">{achievements.length || 0}</div>
            <div className="up-stat-label">Awards</div>
          </div>
          <div className="up-stat-box">
            <div className="up-stat-num">{certs.length || 0}</div>
            <div className="up-stat-label">Certs</div>
          </div>
          <div className="up-stat-box">
            <div className="up-stat-num">{user.loginStreak || 0}</div>
            <div className="up-stat-label">Streak🔥</div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!isOwnProfile && (
        <div className="flex gap-2 mt-5 flex-wrap">
          <button onClick={handleMessage} className="up-btn up-btn-primary">
            💬 Message
          </button>
          {user.role === 'player' && <MateButton userId={user._id} />}
          {user.role === 'player' && (
            challengeSent ? (
              <span className="up-btn up-btn-secondary" style={{ cursor: 'default', opacity: 0.7 }}>
                ⚔️ Challenge Sent
              </span>
            ) : (
              <button onClick={() => setShowChallenge(true)} className="up-btn up-btn-secondary">
                ⚔️ Challenge this player
              </button>
            )
          )}
          <button onClick={() => navigate(-1)} className="up-btn up-btn-secondary">
            ← Back
          </button>
        </div>
      )}
      {isOwnProfile && (
        <div className="flex gap-2 mt-5">
          <button onClick={() => navigate('/profile')} className="up-btn up-btn-primary">
            ✏️ Edit My Profile
          </button>
        </div>
      )}

      {showChallenge && (
        <ChallengeModal
          opponent={user}
          onClose={() => setShowChallenge(false)}
          onChallenged={() => setChallengeSent(true)}
        />
      )}
    </div>
  );
};

export default ProfileHero;
