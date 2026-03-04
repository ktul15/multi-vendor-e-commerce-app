import 'package:shared_preferences/shared_preferences.dart';

/// Web-compatible token storage using shared_preferences.
/// Instance-based for dependency injection and testability.
class TokenStorage {
  final SharedPreferences _prefs;

  TokenStorage({required SharedPreferences prefs}) : _prefs = prefs;

  static const _accessTokenKey = 'vendor_access_token';
  static const _refreshTokenKey = 'vendor_refresh_token';

  /// Save tokens after login/register.
  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await Future.wait([
      _prefs.setString(_accessTokenKey, accessToken),
      _prefs.setString(_refreshTokenKey, refreshToken),
    ]);
  }

  /// Get the stored access token.
  Future<String?> getAccessToken() async {
    return _prefs.getString(_accessTokenKey);
  }

  /// Get the stored refresh token.
  Future<String?> getRefreshToken() async {
    return _prefs.getString(_refreshTokenKey);
  }

  /// Clear all tokens (logout).
  Future<void> clearTokens() async {
    await Future.wait([
      _prefs.remove(_accessTokenKey),
      _prefs.remove(_refreshTokenKey),
    ]);
  }

  /// Check if user has stored tokens (potential auto-login).
  Future<bool> hasTokens() async {
    final token = _prefs.getString(_accessTokenKey);
    return token != null && token.isNotEmpty;
  }
}
