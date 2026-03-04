import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Secure token storage using flutter_secure_storage.
/// Stores access and refresh tokens in the platform keychain/keystore.
class TokenStorage {
  TokenStorage._();

  static const _storage = FlutterSecureStorage();

  static const _accessTokenKey = 'access_token';
  static const _refreshTokenKey = 'refresh_token';

  /// Save tokens after login/register.
  static Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await Future.wait([
      _storage.write(key: _accessTokenKey, value: accessToken),
      _storage.write(key: _refreshTokenKey, value: refreshToken),
    ]);
  }

  /// Get the stored access token.
  static Future<String?> getAccessToken() {
    return _storage.read(key: _accessTokenKey);
  }

  /// Get the stored refresh token.
  static Future<String?> getRefreshToken() {
    return _storage.read(key: _refreshTokenKey);
  }

  /// Clear all tokens (logout).
  static Future<void> clearTokens() async {
    await Future.wait([
      _storage.delete(key: _accessTokenKey),
      _storage.delete(key: _refreshTokenKey),
    ]);
  }

  /// Check if user has stored tokens (potential auto-login).
  static Future<bool> hasTokens() async {
    final token = await _storage.read(key: _accessTokenKey);
    return token != null && token.isNotEmpty;
  }
}
