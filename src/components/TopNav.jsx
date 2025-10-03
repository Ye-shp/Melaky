import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';

export default function TopNav() {
  const { authUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="glass sticky top-0 z-50 border-b border-white/10"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex h-20 items-center justify-between">
          <div className="flex items-center gap-8">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="text-2xl font-bold"
            >
              <span className="text-gradient-blue">Melaky</span>
            </motion.div>
            
            <div className="hidden md:flex items-center gap-2">
              <NavItem to="/app" end>Dashboard</NavItem>
              <NavItem to="/friends">Friends</NavItem>
              <NavItem to="/create">Create</NavItem>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {authUser && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-3"
              >
                {authUser.photoURL ? (
                  <motion.img 
                    whileHover={{ scale: 1.1 }}
                    src={authUser.photoURL} 
                    alt="avatar" 
                    className="h-10 w-10 rounded-full ring-2 ring-white/20"
                  />
                ) : (
                  <motion.div 
                    whileHover={{ scale: 1.1 }}
                    className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold ring-2 ring-white/20"
                  >
                    {authUser.email ? authUser.email[0].toUpperCase() : 'U'}
                  </motion.div>
                )}
                <div className="text-white text-sm font-medium hidden sm:block">
                  {authUser.displayName || authUser.email}
                </div>
              </motion.div>
            )}
            
            <motion.button 
              onClick={handleLogout}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-5 py-2.5 rounded-xl glass-strong font-semibold text-sm hover:bg-white/15 transition-colors"
            >
              Logout
            </motion.button>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}

function NavItem({ to, children, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `relative px-4 py-2 rounded-xl font-medium text-sm transition-colors ${
          isActive ? 'text-white' : 'text-gray-400 hover:text-white'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {children}
          {isActive && (
            <motion.div
              layoutId="navIndicator"
              className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl border border-blue-500/30"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
        </>
      )}
    </NavLink>
  );
}
