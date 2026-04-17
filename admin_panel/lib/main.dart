import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'core/config/app_router.dart';
import 'core/config/app_env.dart';
import 'core/config/injection_container.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/bloc/auth_cubit.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initDependencies();

  // Await checkAuth before running the app so token is fully restored
  // and router correctly redirects immediately upon first frame.
  await sl<AuthCubit>().checkAuth();

  runApp(const AdminPanelApp());
}

class AdminPanelApp extends StatelessWidget {
  const AdminPanelApp({super.key});

  @override
  Widget build(BuildContext context) {
    // BlocProvider.value — not create — because AuthCubit is a GetIt lazySingleton.
    // Using create: would let flutter_bloc close() the cubit on dispose, leaving
    // a closed instance in GetIt that throws on the next emit().
    return BlocProvider.value(
      value: sl<AuthCubit>(),
      child: Builder(
        builder: (context) {
          final authCubit = context.read<AuthCubit>();
          return MaterialApp.router(
            title: AppEnv.appName,
            debugShowCheckedModeBanner: false,
            theme: AppTheme.light,
            routerConfig: buildAppRouter(authCubit),
          );
        },
      ),
    );
  }
}
