import React, { useState } from 'react';
import { User, Lock, Wallet, Bell, Save, X, Eye, EyeOff } from 'lucide-react';
import { api } from '../../../services/api';
import toast from 'react-hot-toast';

interface UserSettings {
  name: string;
  email: string;
  monthlyBudget: number;
  notificationsEnabled: boolean;
  darkMode: boolean;
}

interface SettingsPageProps {
  settings: UserSettings;
  onSave: (settings: UserSettings) => void;
  onClose: () => void;
}

export function SettingsPage({ settings, onSave, onClose }: SettingsPageProps) {
  const [formData, setFormData] = useState<UserSettings>(settings);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, type, value, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : name === 'monthlyBudget' ? Number(value) : value,
    });
  };

  const handleSave = () => {
    onSave(formData);
    toast.success('Settings saved!');
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      toast.error('Password needs uppercase, lowercase, and a number'); return;
    }
    setChangingPassword(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      toast.success('Password changed! Please log in again.');
      setShowPasswordForm(false);
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  // Close on Escape
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-gray-100 bg-white rounded-t-2xl">
          <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg" aria-label="Close">
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Profile */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <User className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Profile</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          {/* Budget */}
          <div className="border-t border-gray-200 pt-8">
            <div className="flex items-center gap-3 mb-6">
              <Wallet className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">Budget Settings</h3>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Budget (₹)</label>
              <input type="number" name="monthlyBudget" value={formData.monthlyBudget} onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <p className="text-xs text-gray-600 mt-2">Set your monthly spending limit</p>
            </div>
          </div>

          {/* Notifications */}
          <div className="border-t border-gray-200 pt-8">
            <div className="flex items-center gap-3 mb-6">
              <Bell className="w-5 h-5 text-yellow-600" />
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Budget Alerts</p>
                <p className="text-sm text-gray-600">Get notified when approaching budget limit</p>
              </div>
              <input type="checkbox" name="notificationsEnabled" checked={formData.notificationsEnabled} onChange={handleChange}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500" />
            </div>
          </div>

          {/* Security */}
          <div className="border-t border-gray-200 pt-8">
            <div className="flex items-center gap-3 mb-6">
              <Lock className="w-5 h-5 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-900">Security</h3>
            </div>

            {!showPasswordForm ? (
              <button onClick={() => setShowPasswordForm(true)}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all">
                Change Password
              </button>
            ) : (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                  <input type={showCurrent ? 'text' : 'password'} value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-8 text-gray-400 hover:text-gray-600">
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input type={showNew ? 'text' : 'password'} value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button type="button" onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-8 text-gray-400 hover:text-gray-600">
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <p className="text-xs text-gray-500 mt-1">Min 8 chars, uppercase, lowercase, and a number</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { setShowPasswordForm(false); setCurrentPassword(''); setNewPassword(''); }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancel</button>
                  <button onClick={handleChangePassword} disabled={changingPassword || !currentPassword || !newPassword}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                    {changingPassword ? 'Changing...' : 'Change Password'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 flex gap-3 p-6 border-t border-gray-100 bg-white rounded-b-2xl">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2">
            <Save className="w-4 h-4" /> Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
