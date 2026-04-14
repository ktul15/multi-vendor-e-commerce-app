import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../core/config/app_router.dart';
import '../../../core/config/injection_container.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/skeleton_box.dart';
import '../bloc/notification_cubit.dart';
import '../bloc/notification_state.dart';
import '../widgets/notification_tile.dart';
import '../widgets/notifications_skeleton.dart';

class NotificationCenterPage extends StatefulWidget {
  const NotificationCenterPage({super.key});

  @override
  State<NotificationCenterPage> createState() => _NotificationCenterPageState();
}

class _NotificationCenterPageState extends State<NotificationCenterPage> {
  final _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    sl<NotificationCubit>().loadNotifications();
    _scrollController.addListener(_onScroll);
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      sl<NotificationCubit>().loadMore();
    }
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider.value(
      value: sl<NotificationCubit>(),
      child: Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          title: const Text('Notifications'),
          actions: [
            BlocBuilder<NotificationCubit, NotificationState>(
              builder: (context, state) {
                if (state is NotificationLoaded && state.unreadCount > 0) {
                  return TextButton(
                    onPressed: () =>
                        context.read<NotificationCubit>().markAllAsRead(),
                    child: const Text('Mark all read'),
                  );
                }
                return const SizedBox.shrink();
              },
            ),
          ],
        ),
        body: BlocBuilder<NotificationCubit, NotificationState>(
          builder: (context, state) {
            if (state is NotificationInitial) {
              return SkeletonContainer(child: const NotificationsSkeleton());
            }

            final loaded = state as NotificationLoaded;

            if (loaded.isLoading) {
              return SkeletonContainer(child: const NotificationsSkeleton());
            }

            if (loaded.notifications.isEmpty) {
              return const EmptyState(
                icon: Icons.notifications_none_outlined,
                title: 'No notifications yet',
                subtitle: 'You\'ll be notified about order updates here',
              );
            }

            return RefreshIndicator(
              color: AppColors.primary,
              onRefresh: () => context.read<NotificationCubit>().refresh(),
              child: ListView.separated(
                controller: _scrollController,
                itemCount:
                    loaded.notifications.length + (loaded.isLoadingMore ? 1 : 0),
                separatorBuilder: (_, _) =>
                    const Divider(height: 1, indent: AppSpacing.base),
                itemBuilder: (context, index) {
                  if (index == loaded.notifications.length) {
                    return const Padding(
                      padding: EdgeInsets.all(AppSpacing.base),
                      child: Center(child: CircularProgressIndicator()),
                    );
                  }

                  final notification = loaded.notifications[index];
                  return NotificationTile(
                    notification: notification,
                    onTap: () {
                      context
                          .read<NotificationCubit>()
                          .markAsRead(notification.id);

                      // Deep-link to order detail if data contains orderId
                      final orderId = notification.data?['orderId'] as String?;
                      if (orderId != null) {
                        context.pushNamed(
                          AppRoutes.orderDetailName,
                          pathParameters: {'id': orderId},
                        );
                      }
                    },
                  );
                },
              ),
            );
          },
        ),
      ),
    );
  }
}
