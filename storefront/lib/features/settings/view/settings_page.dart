import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/theme_cubit.dart';
import '../bloc/theme_state.dart';

class SettingsPage extends StatelessWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: BlocBuilder<ThemeCubit, ThemeState>(
        builder: (context, state) {
          final currentMode = (state as ThemeLoaded).mode;

          return ListView(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
                child: Text(
                  'APPEARANCE',
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                        letterSpacing: 1.2,
                      ),
                ),
              ),
              _ThemeOptionTile(
                title: 'System default',
                subtitle: 'Follow device setting',
                icon: Icons.brightness_auto_outlined,
                mode: ThemeMode.system,
                selected: currentMode == ThemeMode.system,
              ),
              _ThemeOptionTile(
                title: 'Light',
                subtitle: 'Always use light theme',
                icon: Icons.light_mode_outlined,
                mode: ThemeMode.light,
                selected: currentMode == ThemeMode.light,
              ),
              _ThemeOptionTile(
                title: 'Dark',
                subtitle: 'Always use dark theme',
                icon: Icons.dark_mode_outlined,
                mode: ThemeMode.dark,
                selected: currentMode == ThemeMode.dark,
              ),
            ],
          );
        },
      ),
    );
  }
}

class _ThemeOptionTile extends StatelessWidget {
  const _ThemeOptionTile({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.mode,
    required this.selected,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final ThemeMode mode;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon),
      title: Text(title),
      subtitle: Text(subtitle),
      trailing: selected
          ? Icon(
              Icons.check_circle_rounded,
              color: Theme.of(context).colorScheme.primary,
            )
          : const Icon(Icons.radio_button_unchecked),
      onTap: () => context.read<ThemeCubit>().setThemeMode(mode),
    );
  }
}
