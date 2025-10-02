import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function TopNav() {
  const { authUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const linkBase = 'px-3 py-2 rounded-md text-sm font-medium';
  const linkActive = 'bg-gray-800 text-white';
  const linkIdle = 'text-gray-300 hover:bg-gray-700 hover:text-white';

  return (
    <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="text-xl font-bold text-white">Melaky</div>
            <div className="hidden md:flex items-center gap-2">
              <NavLink to="/app" end className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkIdle}`}>Dashboard</NavLink>
              <NavLink to="/friends" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkIdle}`}>Friends</NavLink>
              <NavLink to="/create" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkIdle}`}>Create</NavLink>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {authUser && (
              <div className="flex items-center gap-2">
                {authUser.photoURL ? (
                  <img src={authUser.photoURL} alt="avatar" className="h-8 w-8 rounded-full" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center text-gray-300 text-xs">
                    {authUser.email ? authUser.email[0].toUpperCase() : 'U'}
                  </div>
                )}
                <div className="text-gray-300 text-sm hidden sm:block">
                  {authUser.displayName || authUser.email}
                </div>
              </div>
            )}
            <button onClick={handleLogout} className="px-3 py-2 rounded-md text-sm font-medium bg-gray-800 text-white hover:bg-gray-700">
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}


