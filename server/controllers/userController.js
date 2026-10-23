const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const tg = require('../utils/telegramNotifier');
const { logAudit } = require('../utils/auditLogger');

const getUsers = asyncHandler(async (req, res) => {
  // If user is employee, only let them see their own basic user profile unless granted permission
  if (req.user?.role === 'employee' || ['storekeeper', 'cashier'].includes(req.user?.role)) {
    const user = await User.findById(req.user._id).select('-password');
    return res.json(user ? [user] : []);
  }

  const users = await User.find({}).select('-password').sort({ createdAt: -1 });
  res.json(users);
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) { res.status(404); throw new Error('User not found'); }

  // Authority boundary: Only System Developer can assign or remove 'developer' role
  if (req.body.role && req.body.role === 'developer' && req.user?.role !== 'developer') {
    res.status(403);
    throw new Error('Access denied: Only the System Developer/Owner can assign the Developer role.');
  }

  // Authority boundary: Administrators cannot modify Developer accounts
  if (user.role === 'developer' && req.user?.role !== 'developer') {
    res.status(403);
    throw new Error('Access denied: You cannot modify a System Developer account without Developer privileges.');
  }

  // Authority boundary: Employees cannot modify other user accounts
  if (req.user?.role === 'employee' || ['storekeeper', 'cashier'].includes(req.user?.role)) {
    res.status(403);
    throw new Error('Access denied: Employees cannot manage user accounts or permissions.');
  }

  // Authority boundary: Only System Developer/Owner can configure custom user permissions
  if (req.body.customPermissions !== undefined && req.user?.role !== 'developer') {
    res.status(403);
    throw new Error('Access denied: Only the authenticated System Developer & Owner can manage individual user permission overrides.');
  }

  const wasActive = user.isActive;
  const oldRole = user.role;
  const changedFields = [];

  if (req.body.name && req.body.name !== user.name) {
    changedFields.push('name');
    user.name = req.body.name;
  }
  if (req.body.role && req.body.role !== user.role) {
    changedFields.push(`role: ${user.role} -> ${req.body.role}`);
    user.role = req.body.role;
  }
  if (req.body.isActive !== undefined && req.body.isActive !== user.isActive) {
    changedFields.push(`isActive: ${user.isActive} -> ${req.body.isActive}`);
    user.isActive = req.body.isActive;
  }
  if (req.body.phone !== undefined) {
    user.phone = req.body.phone;
  }
  if (req.body.telegramChatId !== undefined) {
    user.telegramChatId = req.body.telegramChatId;
  }
  if (req.body.password) {
    changedFields.push('password_reset');
    user.password = req.body.password;
  }
  if (req.body.customPermissions !== undefined) {
    changedFields.push('customPermissions');
    user.customPermissions = req.body.customPermissions;
    user.markModified('customPermissions');
  }

  const updated = await user.save();

  // Audit Log
  await logAudit({
    req,
    action: req.body.customPermissions !== undefined ? 'PERMISSIONS_CHANGE' : req.body.role !== oldRole ? 'ROLE_CHANGE' : 'UPDATE',
    module: 'users',
    resourceId: updated._id,
    resourceName: `${updated.name} (${updated.email})`,
    details: { changedFields, newRole: updated.role, isActive: updated.isActive },
  });

  // Auto-subscribe new Telegram chatId if provided and not already subscribed
  const newChatId = (req.body.telegramChatId || '').trim();
  if (newChatId) {
    try {
      const Setting = require('../models/Setting');
      const settings = await Setting.findOne() || new Setting();
      const subs = settings.telegramSubscribers || [];
      const alreadyExists = subs.some(s => String(s.chatId) === newChatId);
      if (!alreadyExists) {
        subs.push({ chatId: newChatId, name: updated.name, username: updated.email, subscribedAt: new Date() });
        settings.telegramSubscribers = subs;
        await settings.save();
      }
    } catch (e) {
      console.warn('[UpdateUser] Could not auto-subscribe Telegram:', e.message);
    }
  }

  // Notify: account enabled / disabled
  if (req.body.isActive !== undefined && req.body.isActive !== wasActive) {
    tg.notifyUserStatusChanged(updated, req.body.isActive ? 'enabled' : 'disabled', req.user);
  }
  // Notify: role changed
  if (req.body.role !== undefined && req.body.role !== oldRole) {
    tg.notifyUserRoleChanged(updated, oldRole, req.body.role, req.user);
  }

  res.json({
    _id: updated._id,
    name: updated.name,
    email: updated.email,
    role: updated.role,
    isActive: updated.isActive,
    phone: updated.phone || '',
    telegramChatId: updated.telegramChatId || '',
    customPermissions: updated.customPermissions || null,
  });
});

const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) { res.status(404); throw new Error('User not found'); }

  // Authority boundary: Developer accounts cannot be deleted by non-developers
  if (user.role === 'developer' && req.user?.role !== 'developer') {
    res.status(403);
    throw new Error('Access denied: System Developer accounts cannot be deleted.');
  }

  // Authority boundary: Admin accounts can only be removed by Developers
  if (user.role === 'admin' && req.user?.role !== 'developer') {
    res.status(403);
    throw new Error('Access denied: System Administrator accounts can only be removed by the System Developer/Owner.');
  }

  // Authority boundary: Cannot delete yourself
  if (user._id.toString() === req.user._id.toString()) {
    res.status(400);
    throw new Error('You cannot delete your own account while logged in.');
  }

  await logAudit({
    req,
    action: 'DELETE',
    module: 'users',
    resourceId: user._id,
    resourceName: `${user.name} (${user.email})`,
    details: { role: user.role },
  });

  tg.notifyUserDeleted(user, req.user);
  await user.deleteOne();
  res.json({ message: 'User removed successfully' });
});

module.exports = { getUsers, updateUser, deleteUser };
