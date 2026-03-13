import '../core/network/api_client.dart';
import '../core/network/http_client.dart';
import '../core/network/token_storage.dart';

class AuthRepository {
  final HttpClient _client;
  final TokenStorage _tokenStorage;

  AuthRepository({required HttpClient client, required TokenStorage tokenStorage})
      : _client = client,
        _tokenStorage = tokenStorage;

  /// Register a new user.
  Future<Map<String, dynamic>> register({
    required String name,
    required String email,
    required String password,
  }) async {
    final body = await _client.post(
      '/auth/register',
      data: {'name': name, 'email': email, 'password': password},
    );

    final data = body!['data'] as Map<String, dynamic>;
    await _tokenStorage.saveTokens(
      accessToken: data['tokens']['accessToken'] as String,
      refreshToken: data['tokens']['refreshToken'] as String,
    );
    return data['user'] as Map<String, dynamic>;
  }

  /// Login with email and password.
  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    final body = await _client.post(
      '/auth/login',
      data: {'email': email, 'password': password},
    );

    final data = body!['data'] as Map<String, dynamic>;
    await _tokenStorage.saveTokens(
      accessToken: data['tokens']['accessToken'] as String,
      refreshToken: data['tokens']['refreshToken'] as String,
    );
    return data['user'] as Map<String, dynamic>;
  }

  /// Get current user profile.
  Future<Map<String, dynamic>> getProfile() async {
    final body = await _client.get('/auth/profile');
    return body!['data'] as Map<String, dynamic>;
  }

  /// Logout — clear tokens and notify server.
  Future<void> logout() async {
    try {
      final refreshToken = await _tokenStorage.getRefreshToken();
      if (refreshToken != null) {
        await _client.post('/auth/logout', data: {'refreshToken': refreshToken});
      }
    } catch (_) {
      // Ignore logout API errors — we clear tokens regardless
    } finally {
      await _tokenStorage.clearTokens();
      ApiClient.reset();
    }
  }

  /// Check if user has stored tokens for auto-login.
  Future<bool> hasStoredTokens() => _tokenStorage.hasTokens();
}
