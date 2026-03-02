import { useMemo, useState } from 'react';
import { getAvatarColorToken, getInitials } from '../../utils/avatarHelpers';
import './Avatar.css';

export default function Avatar({ name, photoUrl = null, size = 40, className = '' }) {
  const [imgError, setImgError] = useState(false);
  const initials = useMemo(() => getInitials(name), [name]);
  const colorToken = useMemo(() => getAvatarColorToken(name), [name]);
  const normalizedSize = Number(size) > 0 ? Number(size) : 40;
  const showImage = Boolean(photoUrl) && !imgError;

  return (
    <div
      className={`avatar ${className}`.trim()}
      style={{
        '--avatar-size': `${normalizedSize}px`,
        '--avatar-bg': `var(${colorToken})`
      }}
      aria-label={name || 'Avatar'}
      title={name || 'Avatar'}
    >
      {showImage ? (
        <img
          src={photoUrl}
          alt={name || 'Avatar'}
          className="avatar__img"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="avatar__initials" aria-hidden="true">
          {initials}
        </span>
      )}
    </div>
  );
}

