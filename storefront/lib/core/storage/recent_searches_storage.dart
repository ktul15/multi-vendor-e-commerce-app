import 'package:shared_preferences/shared_preferences.dart';

/// Persists the user's recent search queries using SharedPreferences.
/// Keeps up to [maxItems] entries, most-recent first.
class RecentSearchesStorage {
  static const _key = 'recent_searches';
  static const maxItems = 10;

  SharedPreferences? _prefs;

  Future<SharedPreferences> _getPrefs() async {
    _prefs ??= await SharedPreferences.getInstance();
    return _prefs!;
  }

  Future<List<String>> load() async {
    final prefs = await _getPrefs();
    return prefs.getStringList(_key) ?? [];
  }

  /// Prepends [query] to the list (deduplicates and trims to [maxItems]).
  /// Returns the updated list.
  Future<List<String>> add(String query) async {
    final prefs = await _getPrefs();
    final current = prefs.getStringList(_key) ?? [];
    final updated = [
      query,
      ...current.where((q) => q != query),
    ].take(maxItems).toList();
    await prefs.setStringList(_key, updated);
    return updated;
  }

  /// Removes [query] and returns the updated list.
  Future<List<String>> remove(String query) async {
    final prefs = await _getPrefs();
    final current = prefs.getStringList(_key) ?? [];
    final updated = current.where((q) => q != query).toList();
    await prefs.setStringList(_key, updated);
    return updated;
  }

  Future<void> clear() async {
    final prefs = await _getPrefs();
    await prefs.remove(_key);
  }
}
