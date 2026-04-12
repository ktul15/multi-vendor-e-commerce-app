import 'package:shared_preferences/shared_preferences.dart';

/// Persists JWT tokens in SharedPreferences for web.
class TokenStorage {
  static const _accessKey = 'admin_access_token';
  static const _refreshKey = 'admin_refresh_token';

  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_accessKey, accessToken);
    await prefs.setString(_refreshKey, refreshToken);
  }

  Future<String?> getAccessToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_accessKey);
  }

  Future<String?> getRefreshToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_refreshKey);
  }

  Future<bool> hasTokens() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.containsKey(_accessKey) && prefs.containsKey(_refreshKey);
  }

  Future<void> clearTokens() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_accessKey);
    await prefs.remove(_refreshKey);
  }
}
