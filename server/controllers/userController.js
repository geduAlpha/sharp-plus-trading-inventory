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

  // Authority boundary: Only System Developer/Owner can assign Developer or Admin roles
  if (req.body.role && ['developer', 'admin'].includes(req.body.role) && req.user?.role !== 'developer') {
    res.status(403);
    throw new Error('Access denied: Only the System Developer/Owner can assign Developer or Administrator roles.');
  }

  // Authority boundary: Administrators cannot modify Developer or Admin accounts
  if (['developer', 'admin'].includes(user.role) && req.user?.role !== 'developer' && String(user._id) !== String(req.user?._id)) {
    res.status(403);
    throw new Error('Access denied: You cannot modify Developer or Administrator accounts without Developer privileges.');
  }

  // Authority boundary: Employees cannot modify other user accounts
  if (req.user?.role === 'employee' || ['storekeeper', 'cashier', 'manager'].includes(req.user?.role)) {
    res.status(403);
    throw new Error('Access denied: Employees cannot manage user accounts or permissions.');
  }

  // Authority boundary: Permission delegation logic
  // Only System Developer/Owner has full control; System Admin can manage employee permissions ONLY when authorized by Developer
  if (req.body.customPermissions !== undefined && req.user?.role !== 'developer') {
    const Setting = require('../models/Setting');
    const currentSettings = await Setting.findOne();
    const isAuthorizedAdmin = req.user?.role === 'admin' && Boolean(currentSettings?.allowAdminManagePermissions);

    if (!isAuthorizedAdmin) {
      res.status(403);
      throw new Error('Access denied: Only the System Developer/Owner (or an authorized Administrator) can configure employee permissions.');
    }

    // Even when authorized by Developer, Admin CANNOT modify permissions for Developer or Admin accounts
    if (['developer', 'admin'].includes(user.role)) {
      res.status(403);
      throw new Error('Access denied: Administrators cannot modify privileges for Developer or Administrator accounts.');
    }

    // Authority boundary: Administrators cannot grant or alter Sales and Marketing MS privileges for employees (Owner-exclusive)
    const SALES_KEYS = ['salesMarketing', 'cashSales', 'creditSales', 'customers', 'sales_cash', 'sales_credit'];
    const existingSalesPerms = {};
    if (user.customPermissions && typeof user.customPermissions === 'object') {
      SALES_KEYS.forEach(k => {
        if (user.customPermissions[k] !== undefined) {
          existingSalesPerms[k] = user.customPermissions[k];
        }
      });
    }

    if (req.body.customPermissions && typeof req.body.customPermissions === 'object') {
      SALES_KEYS.forEach(k => {
        delete req.body.customPermissions[k];
        if (existingSalesPerms[k] !== undefined) {
          req.body.customPermissions[k] = existingSalesPerms[k];
        }
      });
    }
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
