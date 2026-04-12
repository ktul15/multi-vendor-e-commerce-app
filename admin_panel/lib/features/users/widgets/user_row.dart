import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../models/admin_user_model.dart';
import 'user_role_color.dart';

class UserRow extends StatelessWidget {
  final AdminUserModel user;
  final bool isBanning;
  final VoidCallback onTap;
  final VoidCallback onBanToggle;

  const UserRow({
    super.key,
    required this.user,
    required this.isBanning,
    required this.onTap,
    required this.onBanToggle,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      onTap: onTap,
      contentPadding:
          const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      leading: _UserAvatar(name: user.name, role: user.role),
      title: Text(
        user.name,
        style: AppTextStyles.body.copyWith(
          fontWeight: FontWeight.w600,
          color: AppColors.textPrimary,
        ),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            user.email,
            style: AppTextStyles.caption
                .copyWith(color: AppColors.textSecondary),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 2),
          _RoleBadge(role: user.role),
        ],
      ),
      trailing: user.role == 'ADMIN'
          ? null
          : isBanning
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : Switch(
                  // value: true = switch ON = account is active (not banned).
                  // Inverting isBanned so the "on" state means "active account",
                  // matching standard switch semantics where on = enabled.
                  value: !user.isBanned,
                  onChanged: (_) => onBanToggle(),
                  activeThumbColor: AppColors.success,
                  inactiveThumbColor: AppColors.error,
                  materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
    );
  }
}

class _UserAvatar extends StatelessWidget {
  final String name;
  final String role;

  const _UserAvatar({required this.name, required this.role});

  @override
  Widget build(BuildContext context) {
    final initial = name.isNotEmpty ? name[0].toUpperCase() : '?';
    final color = roleColor(role);
    return CircleAvatar(
      radius: 20,
      backgroundColor: color.withAlpha(30),
      child: Text(
        initial,
        style: AppTextStyles.body.copyWith(
          color: color,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _RoleBadge extends StatelessWidget {
  final String role;

  const _RoleBadge({required this.role});

  @override
  Widget build(BuildContext context) {
    final color = roleColor(role);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withAlpha(20),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        role,
        style: AppTextStyles.caption.copyWith(
          color: color,
          fontWeight: FontWeight.w600,
          fontSize: 10,
        ),
      ),
    );
  }
}
