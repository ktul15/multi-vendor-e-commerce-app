import 'package:shared_preferences/shared_preferences.dart';

/// Persists the user's chosen theme mode using SharedPreferences.
/// Stores one of: 'system' | 'light' | 'dark'.
class ThemeStorage {
  static const _key = 'app_theme_mode';

  SharedPreferences? _prefs;

  Future<SharedPreferences> _getPrefs() async {
    _prefs ??= await SharedPreferences.getInstance();
    return _prefs!;
  }

  Future<String?> load() async {
    final prefs = await _getPrefs();
    return prefs.getString(_key);
  }

  Future<void> save(String mode) async {
    final prefs = await _getPrefs();
    await prefs.setString(_key, mode);
  }
}
