import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({ email, password, username });
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="w-full max-w-md px-6 py-8 bg-gray-800 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-6 text-center">Create your account</h1>
        {error && <div className="mb-4 text-sm text-red-400">{error}</div>}
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} type="text" className="w-full px-3 py-2 bg-gray-700 rounded outline-none" required />
          </div>
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="w-full px-3 py-2 bg-gray-700 rounded outline-none" required />
          </div>
          <div>
            <label className="block text-sm mb-1">Password</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="w-full px-3 py-2 bg-gray-700 rounded outline-none" required />
          </div>
          <button disabled={loading} className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded font-medium">{loading ? 'Loading…' : 'Create account'}</button>
        </form>
        <div className="mt-4 text-sm text-gray-300 text-center">
          Already have an account? <Link to="/login" className="text-blue-400 hover:text-blue-300">Sign in</Link>
        </div>
      </div>
    </div>
  );
}


