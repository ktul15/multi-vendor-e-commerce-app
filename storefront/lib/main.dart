import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_stripe/flutter_stripe.dart';
import 'core/config/app_router.dart';
import 'core/config/app_env.dart';
import 'core/config/injection_container.dart';
import 'core/services/push_notification_service.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/bloc/auth_bloc.dart';
import 'features/auth/bloc/auth_event.dart';
import 'features/settings/bloc/theme_cubit.dart';
import 'features/settings/bloc/theme_state.dart'; // ThemeLoaded

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Firebase before anything else
  await Firebase.initializeApp();
  FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

  // Initialize Stripe before running the app.
  Stripe.publishableKey = AppEnv.stripePublishableKey;
  await Stripe.instance.applySettings();

  // Initialize all dependencies via GetIt
  await initDependencies();

  runApp(const StorefrontApp());
}

class StorefrontApp extends StatelessWidget {
  const StorefrontApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider(create: (_) => sl<ThemeCubit>()),
        BlocProvider(create: (_) => sl<AuthBloc>()..add(AuthCheckRequested())),
      ],
      child: Builder(
        builder: (context) {
          final authBloc = context.read<AuthBloc>();
          final router = appRouter(authBloc);

          return BlocBuilder<ThemeCubit, ThemeState>(
            builder: (context, themeState) {
              // loadTheme() is awaited in initDependencies before runApp,
              // so themeState is always ThemeLoaded here.
              final themeMode = (themeState as ThemeLoaded).mode;

              return MaterialApp.router(
                title: AppEnv.appName,
                debugShowCheckedModeBanner: false,
                theme: AppTheme.light,
                darkTheme: AppTheme.dark,
                themeMode: themeMode,
                routerConfig: router,
              );
            },
          );
        },
      ),
    );
  }
}
