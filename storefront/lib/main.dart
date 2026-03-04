import 'package:flutter/material.dart';
import 'core/config/app_router.dart';
import 'core/theme/app_theme.dart';
import 'core/config/app_env.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const StorefrontApp());
}

class StorefrontApp extends StatelessWidget {
  const StorefrontApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: AppEnv.appName,
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      routerConfig: appRouter,
    );
  }
}
