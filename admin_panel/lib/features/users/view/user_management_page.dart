import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../core/config/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../bloc/admin_user_management_cubit.dart';
import '../bloc/admin_user_management_state.dart';
import '../models/admin_user_model.dart';
import '../widgets/user_row.dart';

class UserManagementPage extends StatefulWidget {
  const UserManagementPage({super.key});

  @override
  State<UserManagementPage> createState() => _UserManagementPageState();
}

class _UserManagementPageState extends State<UserManagementPage> {
  final _searchController = TextEditingController();
  final _scrollController = ScrollController();
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    _scrollController
      ..removeListener(_onScroll)
      ..dispose();
    super.dispose();
  }

  void _onScroll() {
    // Short-circuit before touching the cubit on every scroll event.
    final state = context.read<AdminUserManagementCubit>().state;
    if (state is! AdminUserManagementLoaded) return;
    if (state.isLoadingMore || !state.hasMorePages) return;
    if (_scrollController.position.extentAfter < 200) {
      context.read<AdminUserManagementCubit>().loadMore();
    }
  }

  void _onSearchChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 500), () {
      context.read<AdminUserManagementCubit>().search(value);
    });
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<AdminUserManagementCubit, AdminUserManagementState>(
      listenWhen: (prev, curr) {
        if (curr is AdminUserManagementLoaded &&
            prev is AdminUserManagementLoaded) {
          return curr.transientError != null &&
              curr.transientError != prev.transientError;
        }
        return false;
      },
      listener: (context, state) {
        if (state is AdminUserManagementLoaded &&
            state.transientError != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.transientError!),
              behavior: SnackBarBehavior.floating,
              backgroundColor: AppColors.error,
            ),
          );
          context.read<AdminUserManagementCubit>().clearTransientError();
        }
      },
      builder: (context, state) {
        return Scaffold(
          backgroundColor: AppColors.background,
          appBar: AppBar(
            backgroundColor: AppColors.surface,
            foregroundColor: AppColors.textPrimary,
            elevation: 0,
            scrolledUnderElevation: 1,
            title: const Text('Users'),
            titleTextStyle:
                AppTextStyles.h5.copyWith(color: AppColors.textPrimary),
          ),
          body: switch (state) {
            AdminUserManagementInitial() ||
            AdminUserManagementLoading() =>
              const Center(child: CircularProgressIndicator()),
            AdminUserManagementError(:final message) =>
              _ErrorBody(message: message),
            AdminUserManagementLoaded() => _LoadedBody(
                state: state,
                searchController: _searchController,
                scrollController: _scrollController,
                onSearchChanged: _onSearchChanged,
                isSearching: state.isSearching,
              ),
          },
        );
      },
    );
  }
}

// ── Loaded body ───────────────────────────────────────────────────────────────

class _LoadedBody extends StatelessWidget {
  final AdminUserManagementLoaded state;
  final TextEditingController searchController;
  final ScrollController scrollController;
  final ValueChanged<String> onSearchChanged;
  final bool isSearching;

  const _LoadedBody({
    required this.state,
    required this.searchController,
    required this.scrollController,
    required this.onSearchChanged,
    required this.isSearching,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        _SearchAndFilterBar(
          searchController: searchController,
          roleFilter: state.roleFilter,
          onSearchChanged: onSearchChanged,
          onRoleChanged: (role) =>
              context.read<AdminUserManagementCubit>().filterByRole(role),
        ),
        if (isSearching)
          const LinearProgressIndicator(
            minHeight: 2,
            backgroundColor: AppColors.border,
            color: AppColors.primary,
          )
        else
          const Divider(height: 1, color: AppColors.border),
        Expanded(
          child: RefreshIndicator(
            color: AppColors.primary,
            onRefresh: () =>
                context.read<AdminUserManagementCubit>().refresh(),
            child: _UserList(
              state: state,
              scrollController: scrollController,
            ),
          ),
        ),
      ],
    );
  }
}

class _SearchAndFilterBar extends StatefulWidget {
  final TextEditingController searchController;
  final String? roleFilter;
  final ValueChanged<String> onSearchChanged;
  final ValueChanged<String?> onRoleChanged;

  const _SearchAndFilterBar({
    required this.searchController,
    required this.roleFilter,
    required this.onSearchChanged,
    required this.onRoleChanged,
  });

  @override
  State<_SearchAndFilterBar> createState() => _SearchAndFilterBarState();
}

class _SearchAndFilterBarState extends State<_SearchAndFilterBar> {
  @override
  void initState() {
    super.initState();
    widget.searchController.addListener(_onControllerChanged);
  }

  @override
  void dispose() {
    widget.searchController.removeListener(_onControllerChanged);
    super.dispose();
  }

  void _onControllerChanged() => setState(() {});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.surface,
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.base,
        AppSpacing.sm,
        AppSpacing.base,
        AppSpacing.sm,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextField(
            controller: widget.searchController,
            onChanged: widget.onSearchChanged,
            style: AppTextStyles.body,
            decoration: InputDecoration(
              hintText: 'Search users...',
              hintStyle: AppTextStyles.body
                  .copyWith(color: AppColors.textSecondary),
              prefixIcon: const Icon(
                Icons.search_rounded,
                color: AppColors.textSecondary,
                size: 20,
              ),
              suffixIcon: widget.searchController.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear_rounded, size: 18),
                      onPressed: () {
                        widget.searchController.clear();
                        widget.onSearchChanged('');
                      },
                    )
                  : null,
              filled: true,
              fillColor: AppColors.background,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.base,
                vertical: AppSpacing.sm,
              ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: const BorderSide(color: AppColors.border),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: const BorderSide(color: AppColors.border),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: const BorderSide(
                    color: AppColors.primary, width: 1.5),
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _RoleChip(
                  label: 'All',
                  selected: widget.roleFilter == null,
                  onSelected: () => widget.onRoleChanged(null),
                ),
                const SizedBox(width: AppSpacing.xs),
                _RoleChip(
                  label: 'CUSTOMER',
                  selected: widget.roleFilter == 'CUSTOMER',
                  onSelected: () => widget.onRoleChanged('CUSTOMER'),
                ),
                const SizedBox(width: AppSpacing.xs),
                _RoleChip(
                  label: 'VENDOR',
                  selected: widget.roleFilter == 'VENDOR',
                  onSelected: () => widget.onRoleChanged('VENDOR'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _RoleChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onSelected;

  const _RoleChip({
    required this.label,
    required this.selected,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    return FilterChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => onSelected(),
      labelStyle: AppTextStyles.caption.copyWith(
        color: selected ? AppColors.surface : AppColors.textPrimary,
        fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
      ),
      selectedColor: AppColors.primary,
      backgroundColor: AppColors.background,
      side: BorderSide(
        color: selected ? AppColors.primary : AppColors.border,
      ),
      showCheckmark: false,
      padding: const EdgeInsets.symmetric(horizontal: 4),
    );
  }
}

class _UserList extends StatelessWidget {
  final AdminUserManagementLoaded state;
  final ScrollController scrollController;

  const _UserList({
    required this.state,
    required this.scrollController,
  });

  Future<void> _showBanConfirmation(
    BuildContext context,
    AdminUserModel user,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => _BanConfirmationDialog(user: user),
    );
    if (confirmed == true && context.mounted) {
      context.read<AdminUserManagementCubit>().toggleBan(user);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (state.items.isEmpty) {
      return Center(
        child: Text(
          'No users found',
          style: AppTextStyles.body
              .copyWith(color: AppColors.textSecondary),
        ),
      );
    }

    return ListView.separated(
      controller: scrollController,
      itemCount: state.items.length + 1, // +1 for footer
      separatorBuilder: (context, _) =>
          const Divider(height: 1, color: AppColors.divider),
      itemBuilder: (context, index) {
        if (index == state.items.length) {
          return _ListFooter(state: state);
        }

        final user = state.items[index];
        return UserRow(
          user: user,
          isBanning: state.banningUserIds.contains(user.id),
          onTap: () => context.pushNamed(
            AppRoutes.userDetailName,
            extra: user,
          ),
          onBanToggle: () => _showBanConfirmation(context, user),
        );
      },
    );
  }
}

class _ListFooter extends StatelessWidget {
  final AdminUserManagementLoaded state;

  const _ListFooter({required this.state});

  @override
  Widget build(BuildContext context) {
    if (state.isLoadingMore) {
      return const Padding(
        padding: EdgeInsets.all(AppSpacing.base),
        child: Center(child: CircularProgressIndicator()),
      );
    }
    if (!state.hasMorePages && state.items.isNotEmpty) {
      return Padding(
        padding: const EdgeInsets.all(AppSpacing.base),
        child: Center(
          child: Text(
            'All users loaded',
            style: AppTextStyles.caption
                .copyWith(color: AppColors.textSecondary),
          ),
        ),
      );
    }
    return const SizedBox.shrink();
  }
}

// ── Ban confirmation dialog ───────────────────────────────────────────────────

class _BanConfirmationDialog extends StatelessWidget {
  final AdminUserModel user;

  const _BanConfirmationDialog({required this.user});

  @override
  Widget build(BuildContext context) {
    final isBanning = !user.isBanned;
    final actionLabel = isBanning ? 'Ban' : 'Unban';
    final actionColor = isBanning ? AppColors.error : AppColors.success;
    final bodyText = isBanning
        ? '${user.name} will be unable to log in until unbanned.'
        : '${user.name} will regain access to their account.';

    return AlertDialog(
      title: Text(
        '$actionLabel ${user.name}?',
        style: AppTextStyles.h5,
      ),
      content: Text(bodyText, style: AppTextStyles.body),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(false),
          child: const Text('Cancel'),
        ),
        TextButton(
          onPressed: () => Navigator.of(context).pop(true),
          style: TextButton.styleFrom(foregroundColor: actionColor),
          child: Text(actionLabel),
        ),
      ],
    );
  }
}

// ── Error body ────────────────────────────────────────────────────────────────

class _ErrorBody extends StatelessWidget {
  final String message;

  const _ErrorBody({required this.message});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.wifi_off_rounded, size: 72, color: Colors.grey),
            const SizedBox(height: AppSpacing.base),
            Text(
              'Something went wrong',
              style:
                  AppTextStyles.h5.copyWith(color: AppColors.textPrimary),
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              message,
              style: AppTextStyles.body
                  .copyWith(color: AppColors.textSecondary),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.xl),
            ElevatedButton.icon(
              onPressed: () =>
                  context.read<AdminUserManagementCubit>().refresh(),
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Try Again'),
            ),
          ],
        ),
      ),
    );
  }
}
