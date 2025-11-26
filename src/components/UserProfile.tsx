'use client';

import { useAuth } from '../hooks/useAuth';

export default function UserProfile() {
  const { user, logout, isAuthenticated } = useAuth();

  if (!isAuthenticated) return null;

  return (
    <div className="profile">
      {user?.picture && (
        <img src={user.picture} alt={user?.name || 'User'} />
      )}
      <h2>{user?.name}</h2>
      <p>{user?.email}</p>
      <button onClick={logout}>Log Out</button>
    </div>
  );
}
