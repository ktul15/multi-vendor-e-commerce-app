import 'package:flutter/material.dart';

// ── Animation provider ────────────────────────────────────────────────────────

/// Shares a single [Animation] across all [SkeletonBox] descendants,
/// avoiding one AnimationController per box.
class _SkeletonAnimation extends InheritedWidget {
  final Animation<double> animation;

  const _SkeletonAnimation({
    required this.animation,
    required super.child,
  });

  static Animation<double> of(BuildContext context) {
    return context
        .dependOnInheritedWidgetOfExactType<_SkeletonAnimation>()!
        .animation;
  }

  @override
  bool updateShouldNotify(_SkeletonAnimation old) => true;
}

// ── SkeletonContainer ─────────────────────────────────────────────────────────

/// Wraps [child] with a single fade-pulse animation shared by all [SkeletonBox]
/// descendants. Drop this at the top of any skeleton layout.
class SkeletonContainer extends StatefulWidget {
  final Widget child;

  const SkeletonContainer({super.key, required this.child});

  @override
  State<SkeletonContainer> createState() => _SkeletonContainerState();
}

class _SkeletonContainerState extends State<SkeletonContainer>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat(reverse: true);
    _animation = Tween<double>(begin: 0.25, end: 0.6).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return _SkeletonAnimation(animation: _animation, child: widget.child);
  }
}

// ── SkeletonBox ───────────────────────────────────────────────────────────────

/// A pulsing grey placeholder box. Must be a descendant of [SkeletonContainer].
class SkeletonBox extends StatelessWidget {
  final double width;
  final double height;
  final double radius;

  const SkeletonBox({
    super.key,
    required this.width,
    required this.height,
    this.radius = 8,
  });

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _SkeletonAnimation.of(context),
      child: Container(
        width: width,
        height: height,
        decoration: BoxDecoration(
          color: Colors.grey[300],
          borderRadius: BorderRadius.circular(radius),
        ),
      ),
    );
  }
}
