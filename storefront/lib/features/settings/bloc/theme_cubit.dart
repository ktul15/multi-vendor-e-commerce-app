import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/storage/theme_storage.dart';
import 'theme_state.dart';

class ThemeCubit extends Cubit<ThemeState> {
  final ThemeStorage _storage;

  ThemeCubit({required ThemeStorage storage})
      : _storage = storage,
        super(const ThemeLoaded(mode: ThemeMode.system));

  Future<void> loadTheme() async {
    final stored = await _storage.load();
    emit(ThemeLoaded(mode: _parseMode(stored)));
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    await _storage.save(_serializeMode(mode));
    emit(ThemeLoaded(mode: mode));
  }

  static ThemeMode _parseMode(String? value) {
    switch (value) {
      case 'light':
        return ThemeMode.light;
      case 'dark':
        return ThemeMode.dark;
      default:
        return ThemeMode.system;
    }
  }

  static String _serializeMode(ThemeMode mode) {
    switch (mode) {
      case ThemeMode.light:
        return 'light';
      case ThemeMode.dark:
        return 'dark';
      case ThemeMode.system:
        return 'system';
    }
  }
}
