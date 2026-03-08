import 'dart:async';
import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_dimensions.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';

class _BannerData {
  final String title;
  final String subtitle;
  final String cta;
  final List<Color> gradient;

  const _BannerData({
    required this.title,
    required this.subtitle,
    required this.cta,
    required this.gradient,
  });
}

const _banners = [
  _BannerData(
    title: 'Summer Sale\nUp to 50% Off',
    subtitle: 'Shop the hottest deals of the season',
    cta: 'Shop Now',
    gradient: [Color(0xFF6C63FF), Color(0xFF9C8FFF)],
  ),
  _BannerData(
    title: 'New Arrivals\nJust Dropped',
    subtitle: 'Discover the latest products from top vendors',
    cta: 'Explore',
    gradient: [Color(0xFFFF6584), Color(0xFFFF9CAD)],
  ),
  _BannerData(
    title: 'Free Shipping\nOn Orders \$50+',
    subtitle: 'Shop your favourites with no delivery fee',
    cta: 'Start Shopping',
    gradient: [Color(0xFF10B981), Color(0xFF34D399)],
  ),
];

class BannerCarousel extends StatefulWidget {
  const BannerCarousel({super.key});

  @override
  State<BannerCarousel> createState() => _BannerCarouselState();
}

class _BannerCarouselState extends State<BannerCarousel> {
  final PageController _pageController = PageController();
  int _currentPage = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _startAutoScroll();
  }

  void _startAutoScroll() {
    _timer = Timer.periodic(const Duration(seconds: 4), (_) {
      if (!mounted) return;
      // Read the controller's actual position to avoid stale-page drift
      // when the user swipes mid-animation cycle.
      final currentPage = _pageController.page?.round() ?? _currentPage;
      final next = (currentPage + 1) % _banners.length;
      _pageController.animateToPage(
        next,
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeInOut,
      );
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        SizedBox(
          height: AppDimensions.bannerHeight,
          child: PageView.builder(
            controller: _pageController,
            itemCount: _banners.length,
            onPageChanged: (index) => setState(() => _currentPage = index),
            itemBuilder: (context, index) =>
                _BannerCard(data: _banners[index]),
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(
            _banners.length,
            (i) => AnimatedContainer(
              duration: const Duration(milliseconds: 250),
              margin: const EdgeInsets.symmetric(horizontal: 3),
              width: i == _currentPage ? 20 : 6,
              height: 6,
              decoration: BoxDecoration(
                color: i == _currentPage
                    ? AppColors.primary
                    : AppColors.primary.withAlpha(77),
                borderRadius: BorderRadius.circular(3),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _BannerCard extends StatelessWidget {
  final _BannerData data;

  const _BannerCard({required this.data});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.base),
      child: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: data.gradient,
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(AppRadius.xl),
        ),
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    data.title,
                    style: AppTextStyles.h3.copyWith(
                      color: Colors.white,
                      height: 1.2,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    data.subtitle,
                    style: AppTextStyles.bodySmall.copyWith(
                      color: Colors.white.withAlpha(204),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  ElevatedButton(
                    onPressed: () {
                      // TODO(#23): navigate to promotional collection
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: data.gradient.first,
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.base,
                        vertical: AppSpacing.xs,
                      ),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      textStyle: AppTextStyles.buttonSmall,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(AppRadius.full),
                      ),
                    ),
                    child: Text(data.cta),
                  ),
                ],
              ),
            ),
            const Icon(
              Icons.local_offer_rounded,
              size: 64,
              color: Colors.white24,
            ),
          ],
        ),
      ),
    );
  }
}
